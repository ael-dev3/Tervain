import pathlib,subprocess,json,hashlib,sys
r=pathlib.Path(sys.argv[1]);d=json.loads((r/'crop-metrics.json').read_text());size=960*560*3;reports=[]
for side in ['before','after']:
 out=r/'retained'/f'{side}.mp4'
 subprocess.run(['ffmpeg','-y','-v','error','-framerate','10','-i',str(r/'retained'/f'{side}-%03d.png'),'-c:v','libx264rgb','-crf','0','-preset','medium','-threads','1',str(out)],check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(out),'-f','rawvideo','-pix_fmt','rgb24','-threads','1','-'])
 assert len(raw)==17*size
 hs=[hashlib.sha256(raw[i*size:(i+1)*size]).hexdigest() for i in range(17)]
 assert hs==[x['cropRgbSha256'][side] for x in d['rows']]
 reports.append({'side':side,'frames':17,'size':[960,560],'fps':10,'decodedRgbExact':True,'frameHashes':hs,'clipSha256':hashlib.sha256(out.read_bytes()).hexdigest()})
(r/'video-verification.json').write_text(json.dumps({'pass':True,'videos':reports},indent=2));print('Both lossless clips decode RGB-exact on all 17 frames')
