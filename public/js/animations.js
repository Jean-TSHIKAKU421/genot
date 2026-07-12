// ==========================================
// animations.js
// ==========================================
document.addEventListener('DOMContentLoaded',()=>{
    const mc=document.querySelector('.settings-container,.trash-container,.admin-container,.course-container,.home-container');
    if(mc)anime({targets:mc,opacity:[0,1],translateY:[30,0],duration:500,easing:'easeOutCubic'});
    anime({targets:'.stat-card,.info-item,.trash-item,.item-card,.course-card',opacity:[0,1],translateY:[20,0],delay:anime.stagger(60),duration:400,easing:'easeOutCubic'});
    anime({targets:'.btn,.btn-back,.btn-refresh,.btn-add',scale:[0.9,1],opacity:[0,1],delay:anime.stagger(40),duration:300,easing:'easeOutBack'});
    document.querySelectorAll('.stat-card,.trash-item,.item-card,.course-card,.info-item').forEach(c=>{c.addEventListener('mouseenter',()=>{anime({targets:c,scale:1.02,duration:200,easing:'easeOutCubic'})});c.addEventListener('mouseleave',()=>{anime({targets:c,scale:1,duration:200,easing:'easeOutCubic'})})});
    document.querySelectorAll('.modal-overlay').forEach(m=>{new MutationObserver(mu=>{mu.forEach(mt=>{if(mt.target.style.display==='flex'){const mc2=m.querySelector('.modal-card');if(mc2)anime({targets:mc2,opacity:[0,1],scale:[0.9,1],translateY:[30,0],duration:350,easing:'easeOutCubic'})}})}).observe(m,{attributes:true,attributeFilter:['style']})});
    const av=document.querySelector('.profile-avatar-xlarge,.user-photo-header');if(av){av.addEventListener('mouseenter',()=>{anime({targets:av,rotate:[0,10],scale:[1,1.05],duration:300,easing:'easeOutElastic(1,.5)'})});av.addEventListener('mouseleave',()=>{anime({targets:av,rotate:[10,0],scale:[1.05,1],duration:300,easing:'easeOutElastic(1,.5)'})})}
    document.querySelectorAll('.search-bar input,.search-bar-home input').forEach(i=>{i.addEventListener('focus',()=>{anime({targets:i.parentElement,scale:[1,1.02],duration:200,easing:'easeOutCubic'})});i.addEventListener('blur',()=>{anime({targets:i.parentElement,scale:[1.02,1],duration:200,easing:'easeOutCubic'})})});
    anime({targets:'.scroll-btn',rotate:[0,360],duration:600,easing:'easeOutElastic(1,.5)',delay:800});
    document.querySelectorAll('a,button[onclick*="href"],button[onclick*="location"]').forEach(l=>{l.addEventListener('click',function(e){const h=this.getAttribute('href')||this.getAttribute('onclick')?.match(/['"]([^'"]+)['"]/)?.[1];if(!h||h.startsWith('#')||h.startsWith('javascript'))return;e.preventDefault();const mc3=document.querySelector('.settings-container,.trash-container,.admin-container,.course-container,.home-container');if(mc3){anime({targets:mc3,opacity:[1,0],translateY:[0,-20],duration:200,easing:'easeInCubic',complete:()=>{window.location.href=h}})}else{window.location.href=h}})});
});