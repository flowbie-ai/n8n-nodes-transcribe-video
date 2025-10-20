"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flowbie = void 0;
const n8n_workflow_1 = require("n8n-workflow");
async function uploadVideo(executeFunctions, itemIndex, apiUrl, apiKey) {
    const binaryProperty = executeFunctions.getNodeParameter('binaryProperty', itemIndex);
    let fileName = executeFunctions.getNodeParameter('fileName', itemIndex, '');
    const binaryData = executeFunctions.helpers.assertBinaryData(itemIndex, binaryProperty);
    const fileBuffer = await executeFunctions.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
    fileName = fileName || binaryData.fileName || 'video.mp4';
    const contentType = binaryData.mimeType || 'video/mp4';
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
    });
    if (!initiateResponse.success) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Failed to initiate upload: ${initiateResponse.error || 'Unknown error'}`);
    }
    const { jobId, uploadUrl } = initiateResponse;
    await executeFunctions.helpers.httpRequest({
        method: 'PUT',
        url: uploadUrl,
        headers: {
            'Content-Type': contentType,
        },
        body: fileBuffer,
    });
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
    });
    if (!completeResponse.success) {
        throw new n8n_workflow_1.NodeOperationError(executeFunctions.getNode(), `Failed to complete upload: ${completeResponse.error || 'Unknown error'}`);
    }
    return {
        success: true,
        jobId,
    };
}
class Flowbie {
    constructor() {
        this.description = {
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
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('flowbieApi');
        const apiUrl = credentials.apiUrl;
        const apiKey = credentials.apiKey;
        for (let i = 0; i < items.length; i++) {
            try {
                const uploadResult = await uploadVideo(this, i, apiUrl, apiKey);
                const jobId = uploadResult.jobId;
                const pollInterval = this.getNodeParameter('pollInterval', i, 5);
                const timeoutMinutes = this.getNodeParameter('timeout', i, 30);
                const startTime = Date.now();
                const timeoutMs = timeoutMinutes * 60 * 1000;
                while (true) {
                    const response = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `${apiUrl}/api/jobs/${jobId}`,
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                        },
                    });
                    if (!response.success) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Failed to check job status: ${response.error || 'Unknown error'}`);
                    }
                    const { status, transcription, error } = response;
                    if (status === 'completed') {
                        returnData.push({
                            json: {
                                transcription: (transcription === null || transcription === void 0 ? void 0 : transcription.text) || '',
                                segments: (transcription === null || transcription === void 0 ? void 0 : transcription.segments) || [],
                                jobId,
                            },
                        });
                        break;
                    }
                    if (status === 'failed') {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Transcription failed: ${error || 'Unknown error'}`);
                    }
                    if (Date.now() - startTime > timeoutMs) {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Polling timeout after ${timeoutMinutes} minutes. Job status: ${status}`);
                    }
                    await (0, n8n_workflow_1.sleep)(pollInterval * 1000);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.Flowbie = Flowbie;
//# sourceMappingURL=Flowbie.node.js.map