import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioEvidence } from '../engine/portfolio-evidence.mjs';
const now=Date.now(), day=86400000;
test('portfolio evidence measures PnL change in exact perp windows, independently of account deposits',()=>{
  const evidence=portfolioEvidence({updatedAt:now,stale:false,data:[['perpMonth',{pnlHistory:[[now-30*day,'100'],[now,'350']],accountValueHistory:[[now-30*day,'1000'],[now,'1000000']]}],['perpAllTime',{pnlHistory:[[now-100*day,'0'],[now,'500']]}],['month',{pnlHistory:[[now-30*day,'0'],[now,'999999']]}]]},now);
  assert.equal(evidence.month.pnl,250);assert.equal(evidence.month.days,30);assert.equal(evidence.allTime.pnl,500);
});
test('missing, malformed and single-point portfolio history is unavailable, never zero or spot fallback',()=>{
  for(const history of [[],[[now,'123']],[[now-day,null],[now,'100']],[[now-day,'oops'],[now,'100']]]) assert.equal(portfolioEvidence({data:[['perpMonth',{pnlHistory:history}]]},now).month,null);
  assert.equal(portfolioEvidence({data:[['month',{pnlHistory:[[now-day,'0'],[now,'100']]}]]},now).month,null);
  assert.equal(portfolioEvidence(null,now).stale,true);
});
