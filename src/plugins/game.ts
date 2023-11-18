import { createNoise2D } from 'simplex-noise';

import { EventEmitter } from '/src/libs/events';

import Canvas from './canvas';
import Events from './events';

import backgroundUrl from '/src/assets/background.png';
import birdUrl from '/src/assets/bird.png';
import pipeBottomUrl from '/src/assets/pipe-bottom.png';
import pipeTopUrl from '/src/assets/pipe-top.png';

export type Image = HTMLImageElement;

const loadImage = async (url: string) => new Promise<Image>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);

    img.src = url;
});

const map = (v, f, t, nf, nt) => (v - f) / (t - f) * (nt - nf) + nf;

// Refactoring:
// 1. Game States and their render - initial-load, menu with score, game itself
// 2. In initial load we load assets and proceed to menu with score from local storage
// 3. In menu we render click to start and score (and your last score if any)
// 4. In game we store offset bird y, gravity, velocity and noise seed
// 5. We render on each frame the pipes that we calculate based on noise function (even 2d maybe)
// 6. We know that pipes are 256px apart from each other so we take main offset, add 100 + something
//    and divide it by 256 to find the pipe. If hits, it' immediate game ended with your score

export type LoadState = { type: 'load' };
export type MenuState = { type: 'menu', maxScore: number | null, lastScore: number | null };
export type GameState = { type: 'game', offset: number, bird: { y: number, velocity: number }, noise: any };

const TICKS_PER_SECOND = 50;
const OFFSET_SPEED = 5;
const GRAVITY = .35;
const BIRD_X = 100;
const VELOCITY_UP = -10;
const PIPE_STEP = 256;
const VARIETY = 10;

export default class Game {
    public onTick = new EventEmitter<void>();
    public mode = { type: 'load' } as LoadState | MenuState | GameState;

    constructor (private canvas: Canvas, private events: Events) {
        // First of all we set up event emitter
        // for game ticks
        setInterval(() => {
            this.onTick.emitParallelSync();
        }, 1000 / TICKS_PER_SECOND);

        // The we proceed to render the load state 
        // and load stuff async
        this.canvas.onRender.subscribe((context) => {
            if (this.mode.type === 'load') {
                context.fillStyle = 'green';
                context.font = 'bold 24px VT323';
                context.textAlign = 'center';

                context.fillText('Loading...', this.canvas.rect.width / 2, this.canvas.rect.height / 2);
            }
        }); 

        const assets = new Map<string, Image>();

        ;(async () => {
            assets.set('background', await loadImage(backgroundUrl));
            assets.set('bird', await loadImage(birdUrl));
            assets.set('pipe-bottom', await loadImage(pipeBottomUrl));
            assets.set('pipe-top', await loadImage(pipeTopUrl));
        })().then(() => {
            this.mode = { type: 'menu', maxScore: null, lastScore: null };
        });

        // Now we render menu which is just background 
        // with some text on it, for now we ignore scores
        this.canvas.onRender.subscribe((context) => {
            if (this.mode.type === 'menu') {
                context.fillStyle = 'green';
                context.font = 'bold 24px VT323';
                context.textAlign = 'center';

                context.fillText('Click to start', this.canvas.rect.width / 2, this.canvas.rect.height / 2);
            }
        }); 

        // And, if clicked, we start the game
        this.events.onClick.subscribe(() => {
            if (this.mode.type === 'menu') {
                this.mode = { type: 'game', offset: 0, bird: { velocity: 0, y: this.canvas.rect.height / 2 }, noise: createNoise2D() } 
            }
        });

        // Now we proceed to the game itself
        // 
        this.onTick.subscribe(() => {
            if (this.mode.type === 'game') {
                this.mode.offset += OFFSET_SPEED;
                this.mode.bird.velocity += GRAVITY;
                this.mode.bird.y += this.mode.bird.velocity;



        //         const pipeOffset = Math.floor(-(backgroundOffset - 140) / 256);
        //         const pipe = pipes[pipeOffset];
        //         const birdRelative = 1 - (birdPos.y / this.canvas.rect.height);

        //         if (pipe && (birdRelative > pipe[1] || birdRelative < pipe[0])) {
        //             gameOver = true;
        //         }
        //     }
        //     // console.log(birdRelative)
        //     // console.log(pipe)
            }
        }); 

        const getWindow = (index: number) => {
            if (this.mode.type !== 'game') {
                return null;
            }

            if (index < 3) {
                return { bottom: 1, top : 0 };
            }

            // const complexity = this.mode.offset / 1000;

            const position = map(this.mode.noise(index * VARIETY, 0), -1, 1, .3, .7);
            const spread = map(this.mode.noise(index * VARIETY + 1000, 0), -1, 1, .05, .35);

            const bottom = position + spread;
            const top = position - spread;

            return { top, bottom };
        };

        this.canvas.onRender.subscribe((context) => {
            if (this.mode.type === 'game') {
                // Firt of all we draw background
                // And don't forget to make it infinite
                const background = assets.get('background');
                const ratio = background.width / background.height;
                const width = this.canvas.rect.height * ratio;

                for (let i = 0; i <= Math.ceil(this.canvas.rect.width / width); i ++) {
                    context.drawImage(background, (i * width) - this.mode.offset % width, 0, width + 20, this.canvas.rect.height);
                }

                // Now we draw the bird
                const bird = assets.get('bird');

                context.save();
                context.translate(BIRD_X, this.mode.bird.y);
                context.rotate(this.mode.bird.velocity / 10);
                context.drawImage(bird, - bird.width / 2, - bird.height / 2, bird.width * 1.4, bird.height * 1.4);
                context.restore();

                // Now we render pipes
                const pipeBottom = assets.get('pipe-bottom');
                const pipeTop = assets.get('pipe-top');

                for (let i = 0; i < Math.ceil(this.canvas.rect.width / PIPE_STEP) + 1; ++i) {
                    const index = Math.floor((i * 256 + this.mode.offset) / 256);

                    const { top, bottom } = getWindow(index);

                    context.drawImage(pipeBottom, i * 256 - (this.mode.offset % 256), bottom * this.canvas.rect.height, pipeBottom.width * 2, pipeBottom.height * 2.4);
                    context.drawImage(pipeTop, i * 256 - (this.mode.offset % 256), top * this.canvas.rect.height, pipeTop.width * 2, -pipeTop.height * 2.4);
                }
            }
        });

        // Finally we end game if pipe is hit
        this.onTick.subscribe(() => {
            if (this.mode.type === 'game') {
                const xPoint = this.mode.offset + BIRD_X;

                if (xPoint % 256 < 100) {
                    const currentPipeIndex = Math.floor(xPoint / 256);
                    const { top, bottom } = getWindow(currentPipeIndex);
                    const birdRelativePosition = (this.mode.bird.y / this.canvas.rect.height);

                    if (birdRelativePosition > bottom || birdRelativePosition < top) {
                        this.mode = { type: 'menu', maxScore: null, lastScore: null };
                    }
                }
            }
        });

        // And, if clicked, we start the game
        this.events.onClick.subscribe(() => {
            if (this.mode.type === 'game') {
                this.mode.bird.velocity = VELOCITY_UP;
            }
        });

        // this.events.onMouseMove.subscribe(({ y }) => {
        //     if (this.mode.type === 'game') {
        //         this.mode.bird.y = y;
        //     }
        // });
            

        // //
        // // Draw game over state
        // //
        // let gameOver = false;
        // let birdPos = { x: 100, y: this.canvas.rect.height / 2 };
        // let backgroundOffset = 0;
        // let angle = 0;
        // let downSpeed = 0;
        // let gravity = .4;
        // let pipes = [
        //     [0, 1],
        //     [0, 1],
        //     [.1, .4],
        //     [.2, .5],
        //     [.3, .6],
        //     [.4, .6],
        //     [.45, .6],
        // ];

        // // Draw game state
        // this.canvas.onRender.subscribe((context) => {
        //     if (!loading) {
        //         // Draw background
        //         

        //         // Game is on
        //         if (!gameOver) {
        //             const bird = assets.get('bird');



        //             // context.÷


        //             const height = this.canvas.rect.height;

        //             for (let i = 0; i < pipes.length; ++i) {
        //                 const [from, to] = pipes[i].map((l) => (1 - l) * height);

        //                 context.drawImage(pipeBottom, backgroundOffset + i * 256, from, pipeBottom.width * 2, pipeBottom.height * 2.4);
        //                 context.drawImage(pipeTop, backgroundOffset + i * 256, to, pipeTop.width * 2, -pipeTop.height * 2.4);
        //             }
        //         }

        //         if (gameOver) {
        //             context.fillStyle = 'green';
        //             context.font = 'bold 24px VT323';
        //             context.textAlign = 'center';

        //             context.fillText('Click to start', this.canvas.rect.width / 2, this.canvas.rect.height / 2);
        //         }
        //     }
        // });

        // this.events.onClick.subscribe(() => {
        //     if (!gameOver) {
        //         downSpeed = -9;
        //     } else {
        //         gameOver = false;
        //         // birdPos.x = 0;
        //         backgroundOffset = 0;
        //         pipes = [];
        //     }
        // });

        // setInterval(() => {
        //     if (!gameOver) {
        //         backgroundOffset -= 5;
        //         // angle = downSpeed;
        //         downSpeed += gravity;
        //         birdPos.y += downSpeed;
        //         angle = downSpeed / 10;

        //         const pipeOffset = Math.floor(-(backgroundOffset - 140) / 256);
        //         const pipe = pipes[pipeOffset];
        //         const birdRelative = 1 - (birdPos.y / this.canvas.rect.height);

        //         if (pipe && (birdRelative > pipe[1] || birdRelative < pipe[0])) {
        //             gameOver = true;
        //         }
        //     }
        //     // console.log(birdRelative)
        //     // console.log(pipe)
        // }, 1000 / 40);
    }
};
