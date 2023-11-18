import { EventEmitter } from '/src/libs/events';
import { Point, Rect } from './canvas';

/**
 * This plugin handles html events and forwards them
 * into "drag", "click" etc
 */
export default class AdvancedEvents {
	public onMouseDown = new EventEmitter<Point>();
	public onMouseUp = new EventEmitter<Point>();
	public onMouseMove = new EventEmitter<Point>();
	public onDrag = new EventEmitter<Point>();
	public onClick = new EventEmitter<Point>();
	public onZoom = new EventEmitter<Point>();
	public onKey = new EventEmitter<number>();
	public onKeyDown = new EventEmitter<number>();
	public onKeyUp = new EventEmitter<number>();

	public onSetup = new EventEmitter<HTMLElement>();

	private lastmousepos: Point | null = null;
	private mousepressed = false;

	private rect: DOMRect;

	private map = (p: Point) => {
        return ({ x: p.x - this.rect.x, y: p.y - this.rect.y });
    }

	constructor(private node: HTMLElement) {
        const eventHandlerNode = document.createElement('div');

        eventHandlerNode.style.position = 'absolute';
        eventHandlerNode.style.top = '0px';
        eventHandlerNode.style.left = '0px';
        eventHandlerNode.style.width = '100%';
        eventHandlerNode.style.height = '100%';
        eventHandlerNode.style.zIndex = '100';

        this.node.appendChild(eventHandlerNode);
        this.rect = this.node.getBoundingClientRect();

        setInterval(() => {
            this.rect = this.node.getBoundingClientRect();
        }, 1000);

		eventHandlerNode.addEventListener('mousedown', (e) => {
			const { clientX: x, clientY: y } = e;

			this.lastmousepos = { x, y };
			this.mousepressed = true;

			this.onMouseDown.emitSync(this.map({ x, y }));
		});

        eventHandlerNode.addEventListener('mousemove', (e) => {
			const { clientX: x, clientY: y } = e;

			if (this.mousepressed) {
				const offsetx = x - this.lastmousepos.x, offsety = y - this.lastmousepos.y;

				this.onDrag.emitSync({ x: offsetx, y: offsety });
				this.lastmousepos = { x, y };
			}

			this.onMouseMove.emitSync(this.map({ x, y }));
		});

        eventHandlerNode.addEventListener('mouseup', (e) => {
			const { clientX: x, clientY: y } = e;

			if (this.mousepressed) {
				const offsetx = this.lastmousepos.x - x, offsety = this.lastmousepos.y - y;

				if (Math.abs(offsetx) + Math.abs(offsety) < 20) {
					this.onClick.emitSync(this.map({ x, y }));
				}

				this.mousepressed = false;
			};

			this.onMouseUp.emitSync(this.map({ x, y }));
		});

        eventHandlerNode.addEventListener('mousewheel', (e: any) => {
			this.onZoom.emitSync({ x: e.deltaX, y: e.deltaY });
			e.preventDefault();
		});

		let keys = {};

		document.addEventListener('keydown', (e: any) => {
			if (!keys[e.keyCode]) {
				this.onKey.emitSync(e.keyCode);
				this.onKeyDown.emitSync(e.keyCode);
				keys[e.keyCode] = true;
			}
		});

		document.addEventListener('keyup', (e: any) => {
			this.onKeyUp.emitSync(e.keyCode);
			delete keys[e.keyCode];
		});

		setTimeout(() => {
			this.onSetup.emitSync(eventHandlerNode);
		}, 0);
	}
};