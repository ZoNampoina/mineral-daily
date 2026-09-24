/* ARIZONA image resilience */
(function(){
 window.azImageFallback=function(img){
   if(!img)return;
   const cell=img.parentElement;
   img.remove();
   if(cell && !cell.querySelector('img') && !cell.querySelector('.azImageUnavailable')){
     const p=document.createElement('div');p.className='azImageUnavailable';p.innerHTML='<span>Image indisponible</span><small>Source externe inaccessible</small>';cell.appendChild(p);
   }
 };
 const oldFill=window.fillGallery;
 window.fillGallery=async function(id,l,force=false){
   const box=$(id);if(!box||!l)return;
   box.innerHTML='<div class="small">Chargement des images réelles…</div>';
   const urls=await getImages(l,6,force);
   if(!urls.length){box.innerHTML='<div class="card cardPad small">Aucune image disponible pour le moment.</div>';return}
   box.innerHTML=urls.map((u,i)=>'<img src="'+esc(u)+'" loading="lazy" referrerpolicy="no-referrer" onerror="azImageFallback(this)" alt="'+esc(l.name)+(i>1?' — usage ou produit fini':' — spécimen minéral')+'">').join('');
 };
})();