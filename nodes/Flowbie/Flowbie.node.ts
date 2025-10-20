import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  sleep,
} from 'n8n-workflow';

interface UploadResponse {
  success: boolean;
  jobId: string;
  uploadUrl: string;
  error?: string;
}

interface JobStatusResponse {
  success: boolean;
  status: string;
  transcription?: {
    text: string;
    segments: Array<{
      id: number;
      seek: number;
      start: number;
      end: number;
      text: string;
      tokens: number[];
      temperature: number;
      avg_logprob: number;
      compression_ratio: number;
      no_speech_prob: number;
    }>;
  };
  error?: string;
}

// Helper functions
async function uploadVideo(
  executeFunctions: IExecuteFunctions,
  itemIndex: number,
  apiUrl: string,
  apiKey: string,
): Promise<{ success: boolean; jobId: string }> {
  const binaryProperty = executeFunctions.getNodeParameter('binaryProperty', itemIndex) as string;
  let fileName: string = executeFunctions.getNodeParameter('fileName', itemIndex, '') as string;

  // Get binary data
  const binaryData = executeFunctions.helpers.assertBinaryData(itemIndex, binaryProperty);
  const fileBuffer = await executeFunctions.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
  fileName = fileName || binaryData.fileName || 'video.mp4';
  const contentType = binaryData.mimeType || 'video/mp4';

  // Step 1: Initiate upload
  const initiateResponse = await executeFunctions.helpers.httpRequest({
    method: 'POST',
    url: `${apiUrl}/api/upload/initiate`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      fileName,
      contentType,
      source: 'computer',
    },
  }) as UploadResponse;

  if (!initiateResponse.success) {
    throw new NodeOperationError(
      executeFunctions.getNode(),
      `Failed to initiate upload: ${initiateResponse.error || 'Unknown error'}`,
    );
  }

  const { jobId, uploadUrl } = initiateResponse;

  // Step 2: Upload to signed URL
  await executeFunctions.helpers.httpRequest({
    method: 'PUT',
    url: uploadUrl,
    headers: {
      'Content-Type': contentType,
    },
    body: fileBuffer,
  });

  // Step 3: Complete upload
  const completeResponse = await executeFunctions.helpers.httpRequest({
    method: 'POST',
    url: `${apiUrl}/api/upload/complete`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      jobId,
    },
  }) as { success: boolean; error?: string };

  if (!completeResponse.success) {
    throw new NodeOperationError(
      executeFunctions.getNode(),
      `Failed to complete upload: ${completeResponse.error || 'Unknown error'}`,
    );
  }

  return {
    success: true,
    jobId,
  };
}

export class Flowbie implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Flowbie',
    name: 'flowbie',
    icon: 'file:../../icons/flowbie.svg',
    group: ['transform'],
    version: 1,
    subtitle: 'Transcribe Video',
    description: 'Upload and transcribe videos using Flowbie API',
    defaults: {
      name: 'Flowbie',
    },
    usableAsTool: true,
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'flowbieApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Binary Property',
        name: 'binaryProperty',
        type: 'string',
        default: 'data',
        required: true,
        description: 'Name of the binary property containing the video file',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'video.mp4',
        description: 'Optional custom file name (auto-detected if not provided)',
      },
      {
        displayName: 'Polling Interval (Seconds)',
        name: 'pollInterval',
        type: 'number',
        default: 5,
        description: 'How often to check for transcription completion',
      },
      {
        displayName: 'Timeout (Minutes)',
        name: 'timeout',
        type: 'number',
        default: 30,
        description: 'Maximum time to wait for transcription to complete',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('flowbieApi');
    const apiUrl = credentials.apiUrl as string;
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      try {
        // Step 1: Upload video
        const uploadResult = await uploadVideo(this, i, apiUrl, apiKey);
        const jobId = uploadResult.jobId;

        // Step 2: Poll for completion
        const pollInterval = this.getNodeParameter('pollInterval', i, 5) as number;
        const timeoutMinutes = this.getNodeParameter('timeout', i, 30) as number;

        const startTime = Date.now();
        const timeoutMs = timeoutMinutes * 60 * 1000;

        while (true) {
          const response = await this.helpers.httpRequest({
            method: 'GET',
            url: `${apiUrl}/api/jobs/${jobId}`,
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }) as JobStatusResponse;

          if (!response.success) {
            throw new NodeOperationError(
              this.getNode(),
              `Failed to check job status: ${response.error || 'Unknown error'}`,
            );
          }

          const { status, transcription, error } = response;

          // Check if completed
          if (status === 'completed') {
            returnData.push({
              json: {
                transcription: transcription?.text || '',
                segments: transcription?.segments || [],
                jobId,
              },
            });
            break;
          }

          // Check if failed
          if (status === 'failed') {
            throw new NodeOperationError(
              this.getNode(),
              `Transcription failed: ${error || 'Unknown error'}`,
            );
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            throw new NodeOperationError(
              this.getNode(),
              `Polling timeout after ${timeoutMinutes} minutes. Job status: ${status}`,
            );
          }

          // Wait before next poll
          await sleep(pollInterval * 1000);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
