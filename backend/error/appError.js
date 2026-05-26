export class AppError extends Error {
    constructor (message, status = 500, code = '') {
        super(message);
   
        this.name = 'AppError';
        this.status = status;
        this.code = code;
    }
}