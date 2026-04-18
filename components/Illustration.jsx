// Abstract illustration placeholders: muted color fields + diagonal linework.
// Deterministic from seed so the same post always renders the same composition.
const Illustration = ({ recipe, className='', style={} }) => {
  if (!recipe) return null;
  const { kind, palette, seed } = recipe;
  const [bg, mid, ink] = palette;

  // tiny seeded PRNG
  const rand = (function(){
    let s = seed * 9301 + 49297;
    return () => { s = (s * 9301 + 49297) % 233280; return s/233280; };
  })();

  const diag = (count, opacity=0.18) => {
    const lines = [];
    for (let i=0;i<count;i++){
      const x = (i/count)*1400 - 200;
      lines.push(<line key={i} x1={x} y1={-100} x2={x+600} y2={900} stroke={ink} strokeWidth={1} opacity={opacity}/>);
    }
    return lines;
  };

  const Composition = () => {
    switch(kind){
      case 'wedge': return (<>
        <rect width="1200" height="800" fill={bg}/>
        <polygon points="0,0 1200,0 1200,520 0,760" fill={mid}/>
        <polygon points="0,760 1200,520 1200,800 0,800" fill={ink}/>
        <g>{diag(24, 0.08)}</g>
        <circle cx={920} cy={260} r={110} fill="none" stroke={bg} strokeWidth={1.5} opacity={0.7}/>
      </>);
      case 'grid': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {Array.from({length:6}).map((_,r)=>Array.from({length:9}).map((_,c)=>{
          const on = ((r*3 + c*7 + seed) % 5) < 2;
          return <rect key={r+'-'+c} x={60+c*130} y={60+r*120} width={110} height={100} fill={on?mid:'none'} stroke={ink} strokeWidth={1} opacity={on?0.9:0.35}/>;
        }))}
      </>);
      case 'bars': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {Array.from({length:14}).map((_,i)=>{
          const h = 120 + ((i*53+seed*31)%420);
          return <rect key={i} x={80+i*78} y={800-h-60} width={58} height={h} fill={i%4===0?ink:mid} opacity={i%4===0?0.95:0.75}/>;
        })}
        <line x1={40} y1={740} x2={1160} y2={740} stroke={ink} strokeWidth={1.5}/>
      </>);
      case 'stack': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {Array.from({length:7}).map((_,i)=>(
          <rect key={i} x={120+i*12} y={120+i*70} width={900-i*24} height={52} fill={i%2?mid:ink} opacity={0.82}/>
        ))}
      </>);
      case 'spiral': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {Array.from({length:12}).map((_,i)=>(
          <circle key={i} cx={600+Math.cos(i*0.7)*i*18} cy={400+Math.sin(i*0.7)*i*18} r={200-i*14} fill="none" stroke={i%3===0?ink:mid} strokeWidth={i%3===0?2:1} opacity={0.7}/>
        ))}
      </>);
      case 'rays': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {Array.from({length:18}).map((_,i)=>{
          const a = (i/18)*Math.PI - Math.PI/2;
          const x2 = 600 + Math.cos(a)*1400, y2 = 800 + Math.sin(a)*1400;
          return <line key={i} x1={600} y1={800} x2={x2} y2={y2} stroke={i%2?mid:ink} strokeWidth={i%2?1:2} opacity={0.8}/>;
        })}
        <rect x={0} y={720} width={1200} height={80} fill={ink}/>
      </>);
      case 'blocks': return (<>
        <rect width="1200" height="800" fill={bg}/>
        <rect x={80} y={80} width={500} height={640} fill={mid}/>
        <rect x={620} y={80} width={500} height={300} fill={ink}/>
        <rect x={620} y={420} width={240} height={300} fill={mid} opacity={0.6}/>
        <rect x={880} y={420} width={240} height={300} fill={ink} opacity={0.8}/>
        <g>{diag(12, 0.06)}</g>
      </>);
      case 'type': return (<>
        <rect width="1200" height="800" fill={bg}/>
        <g fontFamily="'Newsreader', serif" fontWeight={700} fill={ink}>
          <text x={80}  y={380} fontSize={380} fontStyle="italic">D</text>
          <text x={380} y={380} fontSize={380}>O</text>
          <text x={720} y={380} fontSize={380} fill={mid}>.</text>
        </g>
        <rect x={80} y={460} width={980} height={6} fill={ink}/>
        <g>{diag(18, 0.1)}</g>
      </>);
      case 'compass': {
        const sage  = '#4A5D3A';
        const terra = '#B8432B';
        const ox = 440, oy = 375; // origin: slightly left of center
        // [bearing°, color, strokeWidth] — compass bearing: 0=N, 90=E, 180=S, 270=W
        const rays = [
          [0,     mid,   4,   0.88],
          [22.5,  sage,  1.5, 0.68],
          [45,    mid,   2.5, 0.82],
          [65,    terra, 5.5, 0.92],  // terracotta accent
          [90,    mid,   4,   0.88],
          [112.5, sage,  1.5, 0.68],
          [135,   mid,   2.5, 0.82],
          [157.5, sage,  1.5, 0.68],
          [180,   mid,   4,   0.88],
          [202.5, sage,  1.5, 0.68],
          [225,   mid,   2.5, 0.82],
          [247.5, sage,  1.5, 0.68],
          [270,   mid,   4,   0.88],
          [292.5, sage,  1.5, 0.68],
          [315,   mid,   2.5, 0.82],
          [337.5, sage,  1.5, 0.68],
        ];
        return (<>
          <rect width="1200" height="800" fill={bg}/>
          {rays.map(([bearing, color, sw, op], i) => {
            const rad = bearing * Math.PI / 180;
            return <line key={i} x1={ox} y1={oy}
              x2={ox + Math.sin(rad) * 1800}
              y2={oy - Math.cos(rad) * 1800}
              stroke={color} strokeWidth={sw} opacity={op}/>;
          })}
          {/* Bold anchor line — bottom third */}
          <rect x={0} y={555} width={1200} height={18} fill={ink}/>
          {/* Origin marker */}
          <circle cx={ox} cy={oy} r={11} fill={terra}/>
        </>);
      }
      case 'signal': return (<>
        <rect width="1200" height="800" fill={bg}/>
        {/* Megaphone — tapering trapezoid, narrow left, wide right */}
        <polygon points="80,382 80,418 320,612 320,188" fill={mid}/>
        {/* Three horizontal bars: sage, terracotta, near-black — decreasing width */}
        <rect x={360} y={262} width={700} height={52} fill="#4A5D3A"/>
        <rect x={360} y={374} width={520} height={52} fill="#B8432B"/>
        <rect x={360} y={486} width={340} height={52} fill={ink}/>
        {/* Destination circle at far right end of middle bar */}
        <circle cx={880} cy={400} r={36} fill={mid}/>
        {/* Subtle diagonal texture */}
        <g>{diag(16, 0.055)}</g>
      </>);
      default: return <rect width="1200" height="800" fill={bg}/>;
    }
  };

  return (
    <svg className={className} style={style} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <Composition />
    </svg>
  );
};

window.Illustration = Illustration;
