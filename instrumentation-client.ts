import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/ingest', method: 'POST' },
    { path: '/api/enhance', method: 'POST' },
  ],
});
