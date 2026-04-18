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
