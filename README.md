# @flowbie/n8n-nodes-transcribe-video

This is an n8n community node. It lets you transcribe videos using Flowbie AI in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Transcribe Video**
  - Upload video from binary data (from previous node output)
  - Automatically polls for completion
  - Returns transcription text and timestamped segments

## Credentials

You need a Flowbie API key to use this node.

### Getting an API Key

1. Sign up at [flowbie.ai](https://flowbie.ai)
2. Go to your dashboard
3. Navigate to the API Keys section
4. Click "Create New API Key"
5. Give it a descriptive name (e.g., "n8n integration")
6. Copy the generated API key

### Configuring in n8n

1. In n8n, click on "Credentials" in the left sidebar
2. Click "Add Credential"
3. Search for "Flowbie API"
4. Enter your API key
5. (Optional) Change the API Gateway URL if using a self-hosted instance
6. Click "Save"

## Compatibility

Compatible with n8n@1.60.0 or later

## Usage

### Basic Example

1. Use an HTTP Request node to download a video (or any node that outputs binary data)
2. Add the Flowbie node to your workflow
3. Select your Flowbie API credentials
4. Configure binary property name (default: "data")
5. Configure polling interval and timeout
6. Execute the workflow

### Example Output

```json
{
  "transcription": "Hello world, this is a test video...",
  "segments": [
    {
      "id": 0,
      "seek": 0,
      "start": 0.0,
      "end": 2.5,
      "text": "Hello world,",
      "tokens": [50364, 50414],
      "temperature": 0.0,
      "avg_logprob": -0.25,
      "compression_ratio": 1.2,
      "no_speech_prob": 0.01
    }
  ],
  "jobId": "job_abc123"
}
```

### Accessing Data in Workflow

Use expressions to access the transcription:
- Full text: `{{ $json.transcription }}`
- Segments: `{{ $json.segments }}`
- First segment text: `{{ $json.segments[0].text }}`
- Job ID: `{{ $json.jobId }}`

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Flowbie API documentation](https://flowbie.ai/docs)
* [Flowbie website](https://flowbie.ai)
