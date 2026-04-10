export class AuthPresenter {
    static toResponse(accessToken: string): { accessToken: string } {
        return { accessToken };
    }
}