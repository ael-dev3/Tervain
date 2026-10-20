import json,pathlib,hashlib,sys
import numpy as np
from PIL import Image
r=pathlib.Path(sys.argv[1]);d=json.loads((r/'report.json').read_text());assert d['complete'] and not d['errors'];assert d['setup']['build']['revision']=='b317734'
assert len(d['records'])==17 and all(x['restoredExact'] and x['before']['mainPasses']==x['after']['mainPasses'] for x in d['records'])
out=r/'retained';out.mkdir(exist_ok=True); rows=[];prev=None
crop=(100,850,1060,1410)
for i in range(17):
 pair=[];hashes={}
 for side in ['before','after']:
  a=np.asarray(Image.open(r/f'{side}-{i:03}.png').convert('RGB').crop(crop));pair.append(a)
  Image.fromarray(a).save(out/f'{side}-{i:03}.png');hashes[side]=hashlib.sha256(a.tobytes()).hexdigest()
 row={'frame':i,'windTime':3+i/10,'cropRgbSha256':hashes,'bright140':[],'nearWhite180':[],'strictWhite245':[],'isolatedBright140':[],'luminanceJumps60':[],'brightJumps140':[]}
 for j,a in enumerate(pair):
  y=a.astype(float)@np.array([.2126,.7152,.0722]);b=y>=140
  neighbours=np.zeros(b.shape,dtype=bool)
  padded=np.pad(b,1)
  for dx in [-1,0,1]:
   for dy in [-1,0,1]:
    if dx or dy:neighbours|=padded[1+dy:1+dy+b.shape[0],1+dx:1+dx+b.shape[1]]
  row['bright140'].append(int(b.sum()));row['nearWhite180'].append(int((y>=180).sum()));row['strictWhite245'].append(int((a.min(axis=2)>=245).sum()));row['isolatedBright140'].append(int((b&~neighbours)[1:-1,1:-1].sum()))
  if prev is None:row['luminanceJumps60'].append(0);row['brightJumps140'].append(0)
  else:
   py=prev[j].astype(float)@np.array([.2126,.7152,.0722]);jump=np.abs(y-py)>60
   row['luminanceJumps60'].append(int(jump.sum()));row['brightJumps140'].append(int((jump&(np.maximum(y,py)>=140)).sum()))
 rows.append(row);prev=pair
summary={'build':d['setup']['build'],'route':d['route'],'buffer':d['setup']['buffer'],'crop':crop,'frames':17,'cropTotals':{k:[sum(x[k][j] for x in rows) for j in [0,1]] for k in rows[0] if k not in ['frame','windTime','cropRgbSha256']},'affectedFullSceneTotals':{k:[sum(x[k][j] for x in d['records']) for j in [0,1]] for k in ['affectedBright140','affectedBright180','affectedStrictWhite','affectedJumps60','affectedBrightJumps140']},'wholeImageMeanLuminance':[sum(x['wholeImageLuma'][j] for x in d['records'])/17 for j in [0,1]],'totalPassCountsEqual':all(x['before']['draws']==x['after']['draws'] and x['before']['triangles']==x['after']['triangles'] for x in d['records']),'allRestoredExact':True,'mainPassCountsEqual':True,'errors':d['errors'],'scope':'Fixed foreground crop, not a semantic grass-only mask or motion-compensated shimmer score; includes natural motion and disocclusion. Paired samples at 10 Hz, not a 60 Hz hardware recording.'}
(r/'crop-metrics.json').write_text(json.dumps({'summary':summary,'rows':rows},indent=2));print(json.dumps(summary,indent=2))
