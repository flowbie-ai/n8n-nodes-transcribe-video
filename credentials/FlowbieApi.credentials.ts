import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FlowbieApi implements ICredentialType {
	name = 'flowbieApi';
	displayName = 'Flowbie API';
	documentationUrl = 'https://flowbie.ai/docs';
	icon = 'file:flowbie.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Flowbie API key (starts with sk_live_)',
			placeholder: 'sk_live_...',
		},
		{
			displayName: 'API Gateway URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://api.flowbie.ai',
			required: true,
			description: 'Flowbie API Gateway URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
