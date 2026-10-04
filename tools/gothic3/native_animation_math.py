# SPDX-License-Identifier: GPL-3.0-only
"""Native XACT transform conversion, using standard column-vector matrices.

rmtools mi_xactreader conjugates raw q then uses row-vector matrices. Transposing
to column convention cancels that conjugation. Reflecting Z yields
q=(-rawX,-rawY,rawZ,rawW), T=(rawX,rawY,-rawZ)/100. Engine.dll's
eCWrapper_emfx2Actor::CleanUpHierachy composes helperRow after childRow;
equivalently helperCol before childCol. The selected actors have unit scale
within source float noise (<=1e-5), zero shear. Non-unit/sheared actors fail
explicitly; their unsupported affine transforms are not silently discarded.
"""
import math


def normalize(q):
    length = math.sqrt(sum(x*x for x in q))
    if not math.isfinite(length) or length < 1e-10: raise ValueError('invalid quaternion')
    return [x/length for x in q]


def translation(v): return [v[0]/100,v[1]/100,-v[2]/100]
def rotation(q): return normalize([-q[0],-q[1],q[2],q[3]])
def normal(v): return [v[0],v[1],-v[2]]
def identity(): return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]


def matrix(t,q):
    x,y,z,w = normalize(q)
    return [1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,t[0],
            2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,t[1],
            2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,t[2],0,0,0,1]


def multiply(a,b):
    return [sum(a[i*4+k]*b[k*4+j] for k in range(4)) for i in range(4) for j in range(4)]


def inverse(a):
    # Only rigid transforms reach this function. Selected source scales are
    # canonicalized to unit within <=1e-5 serialization noise, reported in audit.
    result = [a[0],a[4],a[8],0,a[1],a[5],a[9],0,a[2],a[6],a[10],0,0,0,0,1]
    for row in range(3): result[row*4+3] = -sum(result[row*4+k]*a[k*4+3] for k in range(3))
    return result


def point(m,v): return [sum(m[i*4+k]*v[k] for k in range(3))+m[i*4+3] for i in range(3)]
def column_major(m): return [m[row*4+col] for col in range(4) for row in range(4)]


def decompose(m):
    t = [m[3],m[7],m[11]]; trace = m[0]+m[5]+m[10]
    if trace > 0:
        s=math.sqrt(trace+1)*2; q=[(m[9]-m[6])/s,(m[2]-m[8])/s,(m[4]-m[1])/s,s/4]
    elif m[0]>m[5] and m[0]>m[10]:
        s=math.sqrt(1+m[0]-m[5]-m[10])*2; q=[s/4,(m[1]+m[4])/s,(m[2]+m[8])/s,(m[9]-m[6])/s]
    elif m[5]>m[10]:
        s=math.sqrt(1+m[5]-m[0]-m[10])*2; q=[(m[1]+m[4])/s,s/4,(m[6]+m[9])/s,(m[2]-m[8])/s]
    else:
        s=math.sqrt(1+m[10]-m[0]-m[5])*2; q=[(m[2]+m[8])/s,(m[6]+m[9])/s,s/4,(m[4]-m[1])/s]
    return t,normalize(q)


def removable_helper(name):
    # Local Engine eCWrapper_emfx2Actor::CleanUpHierachy ENTRY3002f955:
    # Contains(_ROOT or _END, case-insensitive) && CountWords('_') >= 3.
    # Hero_ROOT (2 words) is the functional root and remains present.
    upper = name.upper()
    return ('_ROOT' in upper or '_END' in upper) and len([s for s in name.split('_') if s]) >= 3


def cleaned_rig(actor):
    nodes = actor['nodes']; original = {n['name']:n for n in nodes}
    used = {nodes[i['node']]['name'] for s in actor['skins'] for row in s['influences']
            for i in row if i['weight'] > 0}
    removed = {n['name'] for n in nodes if n['parent'] and removable_helper(n['name'])}
    if used & removed: raise ValueError(f'weighted helper removal needs native skin-index repair: {used & removed}')
    for n in nodes:
        if max(abs(x-1) for x in n['scale']) > 1e-5 or any(abs(x)>1e-8 for x in n['shear']):
            raise ValueError(f'unsupported non-unit scale/shear in {n["name"]}')
    globals_ = {}
    def global_matrix(name):
        if name not in globals_:
            n=original[name]; local=matrix(translation(n['position']),rotation(n['rotation']))
            globals_[name]=multiply(global_matrix(n['parent']),local) if n['parent'] else local
        return globals_[name]
    for n in nodes: global_matrix(n['name'])
    clean=[]
    for n in nodes:
        if n['name'] in removed: continue
        parent=n['parent']; chain=[]
        while parent in removed:
            chain.append(parent); parent=original[parent]['parent']
        local=multiply(inverse(globals_[parent]),globals_[n['name']]) if parent else globals_[n['name']]
        t,q=decompose(local)
        clean.append({'name':n['name'],'parent':parent,'translation':t,'rotation':q,'scale':[1,1,1],
                      'removedAncestors':chain,'sourceIndex':nodes.index(n)})
    return clean,globals_,sorted(removed)
