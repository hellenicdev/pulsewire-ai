(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})(),document.querySelector(`#app`).innerHTML=`
  <div class="container">

    <header>
      <h1>PulseWire AI</h1>
      <p class="subtitle">
        Realtime Global News
      </p>
    </header>

    <div class="live-bar">
      ● LIVE NEWS STREAM
    </div>

    <div id="feed"></div>

  </div>
`;var e=document.getElementById(`feed`);async function t(){try{let t=await(await fetch(`https://pulsewire-ai.onrender.com/api/news`)).json();e.innerHTML=``,t.forEach(t=>{let n=document.createElement(`div`);n.className=`card`,n.innerHTML=`
        <h2>${t.title}</h2>

        <div class="meta">
          ${t.source}
        </div>

        <a href="${t.link}" target="_blank">
          Open Article
        </a>
      `,e.appendChild(n)})}catch(t){console.error(t),e.innerHTML=`
      <div class="error">
        Failed to connect to live backend.
      </div>
    `}}t(),setInterval(t,6e4);