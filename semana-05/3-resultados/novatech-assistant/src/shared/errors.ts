export class RequestValidationError extends Error {
	constructor(message: string, readonly details: string[]) {
		super(message);
		this.name = "RequestValidationError";
	}
}
