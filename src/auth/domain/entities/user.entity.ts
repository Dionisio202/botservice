export class User {
    constructor(
        public readonly id:            number,
        public readonly username:      string,
        public readonly password_hash: string,
        public readonly role:          'admin' | 'agent',
        public readonly is_active:     boolean,
    ) {}

    isAdmin(): boolean  { return this.role === 'admin'; }
    isActive(): boolean { return this.is_active; }
}