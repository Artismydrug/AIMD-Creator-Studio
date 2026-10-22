export default function Slide3() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{bottom:'-16vh',left:'-8vw',width:'38vw',height:'38vw',background:'#FF4D00',borderRadius:'50%',opacity:0.1}} /><div className="absolute" style={{top:'15vh',right:'19vw',width:'12vw',height:'12vw',border:'2px solid #FF4D00',transform:'rotate(15deg)'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em'}}>02 / The platform</div></div>
      <div style={{flex:1,marginTop:'7vh'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The platform</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0,maxWidth:'65vw'}}>One platform.<br/>Four connected experiences.</h2><div className="grid grid-cols-2 gap-[2vw]" style={{marginTop:'6vh',maxWidth:'74vw'}}>
        <div style={{background:'#12110F',color:'#FFFBF0',padding:'3vh 2.5vw',minHeight:'17vh'}}><div style={{fontSize:'2.7vw',fontWeight:700,color:'#FF4D00'}}>01</div><div style={{fontSize:'2vw',fontWeight:700,marginTop:'1vh'}}>Learn — guided workshops, modules, and lessons</div></div>
        <div style={{background:'#FF4D00',color:'#12110F',padding:'3vh 2.5vw',minHeight:'17vh'}}><div style={{fontSize:'2.7vw',fontWeight:700}}>02</div><div style={{fontSize:'2vw',fontWeight:700,marginTop:'1vh'}}>Practice — focused drills with clear constraints</div></div>
        <div style={{background:'#FFF5DF',padding:'3vh 2.5vw',minHeight:'17vh',border:'1px solid rgba(18,17,15,0.12)'}}><div style={{fontSize:'2.7vw',fontWeight:700,color:'#FF4D00'}}>03</div><div style={{fontSize:'2vw',fontWeight:700,marginTop:'1vh'}}>Share — studio posts, profiles, and creator feedback</div></div>
        <div style={{background:'#FFF5DF',padding:'3vh 2.5vw',minHeight:'17vh',border:'1px solid rgba(18,17,15,0.12)'}}><div style={{fontSize:'2.7vw',fontWeight:700,color:'#FF4D00'}}>04</div><div style={{fontSize:'2vw',fontWeight:700,marginTop:'1vh'}}>Connect — follows, community discovery, and opportunities</div></div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>03</span></div>
    </div>
  </div>;
}