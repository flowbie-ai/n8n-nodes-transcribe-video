import { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class FlowbieApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    icon: "file:flowbie.svg";
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
