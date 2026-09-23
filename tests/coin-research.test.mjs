import test from 'node:test';
import assert from 'node:assert/strict';
import {coinResearch} from '../engine/coin-research.mjs';
const day=86400000,now=40*day;
const fill=(address,time,side,sz,startPosition,oid)=>({address,fill:{coin:'ETH',time,side,sz:String(sz),startPosition:String(startPosition),px:'100',oid,tid:oid,dir:side==='B'?'Open Long':'Open Short'}});
const analysis=()=>({fillsFetchedAt:now,positionsAt:now,positionsStale:false,latestResponseCount:30,coverage:{gaps:0},risk:{mainEquity:200000},stats:{score:80,completeTrades:30,activeDays:10,netPnl:100,medianHoldMs:5*3600000},coins:[{coin:'ETH',score:80,completeTrades:20,activeDays:7,netPnl:100}],positions:[{coin:'ETH',size:1,value:100}]});
test('brief splits reversals and deduplicates executions without including future data',()=>{
 const r=fill('a',now-100,'A',3,2,1);
 const d=coinResearch({coin:'ETH',records:[r,r,fill('a',now+1,'B',50,0,2)],now});
 assert.deepEqual(d.components,{longIn:0,longOut:200,shortIn:100,shortOut:0});
 assert.equal(d.wallets.length,1);assert.equal(d.behaviors[0].type,'Direction reversal');
});
test('no evidence cannot imply neutral market or confirmed persistence',()=>{
 const d=coinResearch({coin:'ETH',records:[],now});
 assert.equal(d.agreement,'Not enough cohort evidence');
 assert.ok(d.cohorts.every(c=>c.state==='Insufficient sample'));
 assert.equal(d.coverage.checkedRetention,0);
});
test('cohort votes are bounded per wallet and conflicting groups are visible',()=>{
 const records=[],analyses=new Map(),followed=new Set();
 for(let i=0;i<6;i++){
  const address=String(i);records.push(fill(address,now-10,i<3?'B':'A',i===5?10000:1,0,i));
  const a=analysis();if(i>=3){a.coins=[];a.stats.medianHoldMs=60000;followed.add(address);}
  analyses.set(address,a);
 }
 const d=coinResearch({coin:'ETH',records,analyses,followed,now});
 assert.equal(d.cohorts.find(c=>c.id==='specialists').state,'Bullish positioning');
 assert.equal(d.cohorts.find(c=>c.id==='watchlist').state,'Bearish positioning');
 assert.equal(d.cohorts.find(c=>c.id==='consistent').balance,0);
 assert.equal(d.agreement,'Cohorts disagree');
});
test('stale and capped analyses cannot qualify specialists or size anomalies',()=>{
 for(const change of [{fillsFetchedAt:now-2*3600000},{latestResponseCount:2000},{coverage:{gaps:1}}]){
  const a={...analysis(),...change};const d=coinResearch({coin:'ETH',records:[fill('a',now-100,'B',1,0,1)],analyses:new Map([['a',a]]),now});
  assert.equal(d.coverage.specialists,0);
 }
});
test('unusual size uses prior orders only and groups partial fills',()=>{
 const records=[];for(let i=0;i<12;i++)records.push(fill('a',now-(2+i%4)*day-i,'B',1,0,i));
 records.push(fill('a',now-1000,'B',2,0,100),{...fill('a',now-900,'B',2,2,100),fill:{...fill('a',now-900,'B',2,2,100).fill,tid:101}});
 const d=coinResearch({coin:'ETH',records,analyses:new Map([['a',analysis()]]),now});
 const b=d.behaviors.find(b=>b.type==='Unusually large execution');
 assert.equal(b.ratio,4);assert.equal(b.baseline,100);assert.equal(d.coverage.baselineReady,1);
 const thin=coinResearch({coin:'ETH',records:records.slice(-2),analyses:new Map([['a',analysis()]]),now});
 assert.equal(thin.behaviors.some(b=>b.type==='Unusually large execution'),false);
});
test('retention requires a fresh snapshot at or after the execution',()=>{
 const records=[fill('a',now-100,'B',1,0,1)];const a=analysis();
 let d=coinResearch({coin:'ETH',records,analyses:new Map([['a',a]]),now});
 assert.equal(d.coverage.retained,1);
 a.positionsAt=now-200;d=coinResearch({coin:'ETH',records,analyses:new Map([['a',a]]),now});
 assert.equal(d.coverage.checkedRetention,0);
});
test('same-time executions do not invent a final position sequence',()=>{
 const records=[fill('a',now-100,'B',1,0,1),fill('a',now-100,'A',1,1,2)];
 const d=coinResearch({coin:'ETH',records,analyses:new Map([['a',analysis()]]),now});
 assert.equal(d.coverage.checkedRetention,0);
});
