export class QuickReply {
    constructor(
        public readonly id:        number,
        public readonly title:     string,
        public readonly content:   string,
        public readonly category:  string | null,
        public readonly is_active: boolean,
    ) {}

    isActive(): boolean { return this.is_active; }
}