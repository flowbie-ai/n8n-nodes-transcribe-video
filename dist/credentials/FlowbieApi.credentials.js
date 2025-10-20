"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowbieApi = void 0;
class FlowbieApi {
    constructor() {
        this.name = 'flowbieApi';
        this.displayName = 'Flowbie API';
        this.documentationUrl = 'https://flowbie.ai/docs';
        this.icon = 'file:flowbie.svg';
        this.properties = [
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
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.apiUrl}}',
                url: '/health',
                method: 'GET',
            },
        };
    }
}
exports.FlowbieApi = FlowbieApi;
//# sourceMappingURL=FlowbieApi.credentials.js.map