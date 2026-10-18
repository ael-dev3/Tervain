"""Plot a measurement receipt; requires matplotlib. No game captures are altered."""
import gzip,json,os,sys,tempfile
os.environ.setdefault('MPLCONFIGDIR',tempfile.mkdtemp(prefix='tervain-plot-'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
p,out=sys.argv[1:]
with (gzip.open(p,'rt') if p.endswith('.gz') else open(p)) as f:r=json.load(f)
rows=r['rows'];native=[x for x in rows if x['nativeRendered']]
fig,axes=plt.subplots(3,1,figsize=(10,9),sharex=True)
axes[0].plot([x['metre'] for x in rows],[x['maxUpdateMs'] for x in rows],color='#275c91')
axes[0].axhline(25,color='#af4035',linestyle='--',label='25 ms reference')
axes[0].set_ylabel('Max update wall ms\nper 1 m batch');axes[0].legend(loc='upper right')
axes[0].annotate('Initial placement',xy=(0,rows[0]['maxUpdateMs']),xytext=(10,27),fontsize=9,arrowprops={'arrowstyle':'-'})
axes[1].plot([x['metre'] for x in native],[x['gpuQueryMs']/1000 for x in native],marker='o',color='#275c91',label='Software query seconds')
axes[1].set_ylabel('SwiftShader query seconds')
a=axes[1].twinx();a.plot([x['metre'] for x in native],[x['triangles']/1e6 for x in native],color='#9a7444',linestyle='--');a.set_ylabel('Triangles, millions')
axes[2].plot([x['metre'] for x in rows],[x['drawnTreeInstances'] for x in rows],color='#376a45',label='Packed tree instances');axes[2].set_ylabel('Packed tree instances')
b=axes[2].twinx();b.plot([x['metre'] for x in rows],[x['grassPotentialClumps'] for x in rows],color='#9a7444');b.set_ylabel('Eligible central grass clumps')
axes[2].set_xlabel('Distance along controlled path (m)')
for ax in axes:ax.grid(alpha=.25);ax.set_xlim(0,r['setup']['route']['lengthMetres'])
fig.suptitle('0.0.27 · 163ee68 — synthetic 200 m woods-edge traversal\nState sampled every metre; native images/GPU queries every 10 m',fontsize=12)
fig.text(.5,.015,'Software work, not Mac frame pacing. Initial placement excluded from traversal statistics.\nEntry proxies do not score pixel shimmer, shadows or inter-checkpoint stalls.',ha='center',fontsize=9)
fig.tight_layout(rect=(0,.06,1,.94));fig.savefig(out,dpi=140);plt.close(fig)
