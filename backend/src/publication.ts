import type {Pool,PoolClient}from'pg';
export interface PublicationEvents{channel:string;subscribe(listener:(revision:number)=>void):()=>void;}
export class PostgresPublicationEvents implements PublicationEvents{
 private listeners=new Set<(revision:number)=>void>();private client:PoolClient|null=null;private reconnect:ReturnType<typeof setTimeout>|null=null;private stopped=false;private starting=false;private release:(()=>void)|null=null;
 constructor(private pool:Pool,readonly channel='mashrouak_publication'){if(!/^[a-z][a-z0-9_]{0,62}$/.test(channel))throw new Error('invalid_publication_channel');}
 private retry(){if(this.stopped||this.reconnect)return;this.reconnect=setTimeout(()=>{this.reconnect=null;void this.start();},2500);this.reconnect.unref();}
 async start(){
  if(this.stopped||this.client||this.starting)return;this.starting=true;
  let release:(()=>void)|null=null;
  try{
   const client=await this.pool.connect();if(this.stopped){client.release();return;}this.client=client;
   const notification=(event:{channel:string;payload?:string})=>{if(event.channel!==this.channel)return;const revision=Number(event.payload);if(Number.isSafeInteger(revision)&&revision>=0)for(const listener of this.listeners){try{listener(revision);}catch{/* A disconnected stream cannot stop other subscribers. */}}};
   let released=false;
   const failed=()=>{release?.();this.retry();};
   release=()=>{if(released)return;released=true;client.removeListener('notification',notification);client.removeListener('error',failed);if(this.client===client){this.client=null;this.release=null;}client.release(true);};
   this.release=release;client.on('notification',notification);client.once('error',failed);await client.query(`LISTEN ${this.channel}`);
  }catch{release?.();this.retry();}finally{this.starting=false;}
 }
 subscribe(listener:(revision:number)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 async stop(){this.stopped=true;if(this.reconnect)clearTimeout(this.reconnect);this.reconnect=null;const client=this.client;if(client)await client.query(`UNLISTEN ${this.channel}`).catch(()=>{});this.release?.();this.listeners.clear();}
}
