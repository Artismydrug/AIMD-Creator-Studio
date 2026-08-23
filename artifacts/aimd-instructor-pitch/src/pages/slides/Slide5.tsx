export default function Slide5() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:0,right:0,width:'42vw',height:'100vh',background:'#12110F'}} /><div className="absolute" style={{top:'17vh',right:'27vw',width:'17vw',height:'17vw',border:'3px solid #FF4D00',borderRadius:'50%'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em',color:'#FF4D00'}}>04 / The instructor role</div></div>
      <div style={{flex:1,marginTop:'8vh',display:'flex',gap:'7vw'}}><div style={{flex:'0 0 42%'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The instructor role</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0}}>What instructors<br/>can shape</h2><p style={{fontSize:'1.6vw',color:'#6D6A64',lineHeight:1.45,marginTop:'3vh',maxWidth:'30vw'}}>The experience carries your method, your standards, and your voice.</p></div><div style={{flex:1,paddingTop:'5vh'}}>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'2vh',marginBottom:'3vh'}}><div style={{fontSize:'1.9vw',fontWeight:700}}>01&nbsp;&nbsp; Structure a workshop into clear modules</div></div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'2vh',marginBottom:'3vh'}}><div style={{fontSize:'1.9vw',fontWeight:700}}>02&nbsp;&nbsp; Teach through concise, outcome-focused lessons</div></div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'2vh',marginBottom:'3vh'}}><div style={{fontSize:'1.9vw',fontWeight:700}}>03&nbsp;&nbsp; Set drills that turn concepts into repeatable habits</div></div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'2vh',marginBottom:'3vh'}}><div style={{fontSize:'1.9vw',fontWeight:700}}>04&nbsp;&nbsp; Review learner evidence with useful, human feedback</div></div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'1.9vw',fontWeight:700}}>05&nbsp;&nbsp; Create a recognizable teaching voice inside the AIMD community</div></div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span style={{color:'#FF4D00'}}>05</span></div>
    </div>
  </div>;
}