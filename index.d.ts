import { Application } from 'egg'
import * as Joi from 'joi'

interface EggShell {
    (app: object, options: object): Application
}

declare class StatusError {
    constructor(message: string, status?: number);

    message: string;
    status: number;
}

interface SwaggerOpt {
    open?: boolean,
    title?: string;
    version?: string;
    host: string;
    port: string|number;
    schemes?: string[];
    paths: object;
    tokenOpt?: object;
}

interface Decorator {
    (target: any, key: string, descriptor: PropertyDescriptor): void
}

interface MapDecorator {
    (value?: any): Decorator
}

interface SingleDecorator {
    (value: any): Decorator
}

interface CoupleDecorator {
    (value1: any, value2?: any): Decorator
}

export const CUSTOM_MIDDLEWARE_NAME: string
export const EggShell: EggShell
export const StatusError: StatusError

export const Get: MapDecorator
export const Post: MapDecorator
export const Put: MapDecorator
export const Delete: MapDecorator
export const Patch: MapDecorator
export const Options: MapDecorator
export const Head: MapDecorator

export const Before: SingleDecorator
export const After: SingleDecorator
export const Message: SingleDecorator
export const IgnoreJwt: Decorator
export const ResponseMessage: SingleDecorator
export const ResponseErrorMessage: SingleDecorator
export const ResponseCode: SingleDecorator
export const ResponseErrorCode: SingleDecorator

export const Tags: SingleDecorator
export const Summary: SingleDecorator
export const Description: SingleDecorator
export const Parameters: Function
export const Responses: Function
export const Produces: SingleDecorator
export const Consumes: SingleDecorator
export const Hidden: Decorator
export const TokenType: SingleDecorator
export const Render: Decorator

export const IgnoreJwtAll: Function
export const BeforeAll: Function
export const AfterAll: Function
export const Prefix: Function
export const TagsAll: Function
export const HiddenAll: Function
export const TokenTypeAll: Function
export const RenderController: Function
export const Joi: Joi