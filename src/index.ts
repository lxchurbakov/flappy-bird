
// import React from 'react';
// import { createRoot } from 'react-dom/client';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';

// import Page from './page';

import Canvas from '/src/plugins/canvas';
import Events from '/src/plugins/events';

import Game from '/src/plugins/game';

const app = document.getElementById('app');

const canvas = new Canvas(app);
const events = new Events(app);

const game = new Game(canvas, events);



// root.render((
//     <BrowserRouter>
//         <Routes>
//             <Route path="/" element={<Page />} />
//         </Routes>    
//     </BrowserRouter>
// ));
