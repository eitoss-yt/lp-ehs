import json,re,math,base64,io,sys,os
from PIL import Image
src_json,html_dir,out=sys.argv[1:4]
d=json.load(open(src_json))
defs=[];body=[];gid=[0]
def nid(p): gid[0]+=1; return f'{p}{gid[0]}'
def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def col(c):
    m=re.match(r'rgba?\(([^)]+)\)',c.strip())
    if not m: return c.strip(),1
    v=[float(x) for x in m.group(1).split(',')]
    return '#%02x%02x%02x'%tuple(int(round(x)) for x in v[:3]),(v[3] if len(v)>3 else 1)
def split_top(s):
    out=[];depth=0;cur=''
    for ch in s:
        if ch=='(':depth+=1
        if ch==')':depth-=1
        if ch==',' and depth==0: out.append(cur.strip());cur=''
        else: cur+=ch
    if cur.strip(): out.append(cur.strip())
    return out
def stops(parts):
    st=[]
    for p in parts:
        m=re.match(r'(rgba?\([^)]+\)|#[0-9a-fA-F]+)\s*([\d.]+%|[\d.]+px)?',p)
        c,pos=m.group(1),m.group(2)
        st.append([c,pos])
    n=len(st)
    for i,s in enumerate(st):
        if s[1] is None: s[1]=f'{0 if i==0 else 100 if i==n-1 else None}%' if i in (0,n-1) else None
    # fill None linearly
    vals=[None if s[1] is None else float(s[1].rstrip('%px')) for s in st]
    for i in range(n):
        if vals[i] is None:
            j=i
            while vals[j] is None: j+=1
            vals[i]=vals[i-1]+(vals[j]-vals[i-1])/(j-i+1)
    return [(st[i][0],vals[i]) for i in range(n)]
def stop_xml(st):
    o=''
    for c,p in st:
        h,a=col(c); o+=f'<stop offset="{p/100:.4f}" stop-color="{h}" stop-opacity="{a:.3f}"/>'
    return o
def gradient(g,x,y,w,h):
    g=g.strip(); gidn=nid('g')
    if g.startswith('linear-gradient'):
        parts=split_top(g[g.index('(')+1:-1]); ang=180
        if re.match(r'-?[\d.]+deg',parts[0]): ang=float(parts[0][:-3]); parts=parts[1:]
        elif parts[0].startswith('to '): ang={'to right':90,'to bottom':180,'to left':270,'to top':0}.get(parts[0],180); parts=parts[1:]
        t=math.radians(ang); sx,sy=math.sin(t),-math.cos(t); L=abs(w*sx)+abs(h*sy); cx,cy=x+w/2,y+h/2
        defs.append(f'<linearGradient id="{gidn}" gradientUnits="userSpaceOnUse" x1="{cx-sx*L/2:.2f}" y1="{cy-sy*L/2:.2f}" x2="{cx+sx*L/2:.2f}" y2="{cy+sy*L/2:.2f}">{stop_xml(stops(parts))}</linearGradient>')
    else:
        parts=split_top(g[g.index('(')+1:-1]); cx,cy=x+w/2,y+h/2; shape=parts[0]
        m=re.search(r'at ([\d.]+)% ([\d.]+)%',shape)
        if m: cx,cy=x+w*float(m.group(1))/100,y+h*float(m.group(2))/100
        if not re.match(r'(rgba?|#)',shape): parts=parts[1:]
        r=max(math.hypot(cx-px,cy-py) for px in (x,x+w) for py in (y,y+h))
        defs.append(f'<radialGradient id="{gidn}" gradientUnits="userSpaceOnUse" cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}">{stop_xml(stops(parts))}</radialGradient>')
    return f'url(#{gidn})'
def shadow_filter(sh,kind='box'):
    if not sh or sh=='none': return ''
    items=split_top(sh) if kind=='box' else re.findall(r'drop-shadow\((.*?\))\s*([^)]*)\)',sh)
    fe=''
    for it in items:
        if kind=='box':
            m=re.match(r'(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px',it)
        else:
            m=re.match(r'(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px',' '.join(it))
        if not m: continue
        h,a=col(m.group(1)); fe+=f'<feDropShadow dx="{m.group(2)}" dy="{m.group(3)}" stdDeviation="{float(m.group(4))/2:.1f}" flood-color="{h}" flood-opacity="{a}"/>'
    if not fe: return ''
    fid=nid('sh'); defs.append(f'<filter id="{fid}" x="-30%" y="-30%" width="160%" height="170%">{fe}</filter>')
    return f' filter="url(#{fid})"'
imgcache={}
def img_data(src,w):
    p=os.path.normpath(os.path.join(html_dir,src))
    key=(p,int(w))
    if key in imgcache: return imgcache[key]
    im=Image.open(p); tw=min(im.width,int(w*2))
    if im.width>tw: im=im.resize((tw,round(im.height*tw/im.width)),Image.LANCZOS)
    buf=io.BytesIO()
    if im.mode in('RGBA','LA','P'): im.save(buf,'PNG',optimize=True); mt='png'
    else: im.convert('RGB').save(buf,'JPEG',quality=90); mt='jpeg'
    imgcache[key]=f'data:image/{mt};base64,'+base64.b64encode(buf.getvalue()).decode(); return imgcache[key]
FONT="'Noto Sans JP','Noto Sans CJK JP','Hiragino Sans','Yu Gothic',sans-serif"
rank={'svg':0,'box':1,'img':2,'text':3}
items=sorted(d['items'],key=lambda i:(i['z'],i['order'],rank[i['k']]))
# body bg
W=H=1080
bb=d['bodyBg']
fill=gradient(bb,0,0,W,H) if 'gradient' in bb else col(bb)[0]
body.append(f'<rect id="background" width="{W}" height="{H}" fill="{fill}"/>')
tn=0
for i in items:
    x,y,w,h=i['x'],i['y'],i.get('w',0),i.get('h',0)
    rot=f' transform="rotate({i["angle"]:.2f} {x+w/2:.2f} {y+h/2:.2f})"' if abs(i.get('angle',0))>0.01 else ''
    op=f' opacity="{i["op"]:.2f}"' if i.get('op',1)<0.999 and i['k']!='text' else ''
    if i['k']=='svg':
        inner=i['html']
        body.append(f'<svg id="{nid("graphic")}" x="{x}" y="{y}" width="{w}" height="{h}" viewBox="0 0 {w:.0f} {h:.0f}" overflow="hidden">{inner}</svg>')
    elif i['k']=='box':
        if i.get('cls')=='grid':
            pid=nid('grid'); sz=float(i['bgSize'].split('px')[0]); hc,a=col('rgba(51, 85, 209, 0.07)')
            m=re.search(r'rgba?\([^)]+\)',i['bg']); hc,a=col(m.group(0))
            defs.append(f'<pattern id="{pid}" width="{sz}" height="{sz}" patternUnits="userSpaceOnUse"><rect width="{sz}" height="1" fill="{hc}" fill-opacity="{a}"/><rect width="1" height="{sz}" fill="{hc}" fill-opacity="{a}"/></pattern>')
            body.append(f'<rect id="grid" x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#{pid})"/>'); continue
        f='none'; fo=''
        if i['bg']: f=gradient(i['bg'],x,y,w,h)
        elif i['bgc']!='rgba(0, 0, 0, 0)':
            hc,a=col(i['bgc']); f=hc; fo=f' fill-opacity="{a}"' if a<1 else ''
        st=''
        if i['border']:
            hc,a=col(i['border']['c']); bw=i['border']['w']; st=f' stroke="{hc}" stroke-opacity="{a}" stroke-width="{bw}"'
            x+=bw/2;y+=bw/2;w-=bw;h-=bw
        r=i['radius']
        if r.endswith('%'): rx,ry=w*float(r[:-1])/100,h*float(r[:-1])/100
        else: rx=ry=min(float(r[:-2]),h/2,w/2)
        flt=shadow_filter(i['shadow'])
        if r=='50%' and abs(w-h)<0.5: body.append(f'<circle cx="{x+w/2:.2f}" cy="{y+h/2:.2f}" r="{w/2:.2f}" fill="{f}"{fo}{st}{flt}{op}{rot}/>')
        elif r=='50%': body.append(f'<ellipse cx="{x+w/2:.2f}" cy="{y+h/2:.2f}" rx="{w/2:.2f}" ry="{h/2:.2f}" fill="{f}"{fo}{st}{flt}{op}{rot}/>')
        else: body.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{f}"{fo}{st}{flt}{op}{rot}/>')
    elif i['k']=='img':
        flt=shadow_filter(i['shadow']) or (shadow_filter(i['filter'],'drop') if i['filter'] not in ('none',None) else '')
        name=os.path.splitext(os.path.basename(i['src']))[0]
        g=f'<g id="{nid("img-"+name+"-")}"{rot}{op}>'
        if i['outline']:
            ow=i['outline']['w']; hc,_=col(i['outline']['c'])
            g+=f'<rect x="{x-ow:.2f}" y="{y-ow:.2f}" width="{w+2*ow:.2f}" height="{h+2*ow:.2f}" fill="{hc}"{flt}/>'; flt=''
        g+=f'<image x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" preserveAspectRatio="none" xlink:href="{img_data(i["src"],w)}"{flt}/></g>'
        body.append(g)
    else:
        tn+=1; hc,a=col(i['color']); a*=i['op']
        ls=f' letter-spacing="{i["ls"].replace("px","")}"' if i['ls'] not in ('normal','0px') else ''
        trot=f' transform="rotate({i["angle"]:.2f} {i["cx"]:.2f} {i["cy"]:.2f})"' if abs(i.get('angle',0))>0.01 else ''
        body.append(f'<text id="text{tn}" x="{x:.2f}" y="{y:.2f}" font-family="{FONT}" font-size="{i["fs"]}" font-weight="{i["fw"]}" fill="{hc}"{f" fill-opacity=\"{a:.2f}\"" if a<0.999 else ""}{ls}{trot} xml:space="preserve">{esc(i["text"])}</text>')
svg=f'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n<defs>{"".join(defs)}</defs>\n'+'\n'.join(body)+'\n</svg>\n'
open(out,'w').write(svg); print(out, len(svg)//1024,'KB', tn,'texts')
