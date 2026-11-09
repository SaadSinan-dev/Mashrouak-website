import { useEffect } from 'react';
/** Hand off the static bootstrap wireframe as soon as React owns the page. */
export function AppLoader(){
 useEffect(()=>{document.getElementById('app-loader')?.remove();},[]);
 return null;
}
