import {createBuilder} from 'vite';
const builder=await createBuilder({configFile:'vite.railway.config.ts'});
await builder.buildApp();
