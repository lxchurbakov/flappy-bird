import { EventEmitter } from '/src/libs/events';

export type Point = { x: number, y: number };
export type Rect = { width: number, height: number };

export default class Canvas {
    public rect: Rect;
	public canvas: HTMLCanvasElement;
	public context: CanvasRenderingContext2D;

    public onRender = new EventEmitter<CanvasRenderingContext2D>();

    constructor (public root: HTMLElement) {
		const pixelRatio = window.devicePixelRatio || 1;

        this.rect = this.root.getBoundingClientRect();
        this.canvas = document.createElement('canvas');

		this.canvas.style.width = this.rect.width + 'px';
		this.canvas.style.height = this.rect.height + 'px';
		this.canvas.width = this.rect.width * pixelRatio;
		this.canvas.height = this.rect.height * pixelRatio;

        this.root.appendChild(this.canvas);

        this.context = this.canvas.getContext('2d');
		this.context.scale(pixelRatio, pixelRatio);

        requestAnimationFrame(this.render);
    }

	public render = () => {
		this.context.clearRect(0, 0, this.rect.width, this.rect.height);
		this.onRender.emitSync(this.context);
		requestAnimationFrame(this.render);
	};
};