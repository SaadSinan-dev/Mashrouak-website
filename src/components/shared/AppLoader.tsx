import { useLayoutEffect } from 'react';
/** Remove the pre-JavaScript shell before the first React frame is painted. */
export function AppLoader(){
 useLayoutEffect(()=>{document.getElementById('app-loader')?.remove();},[]);
 return null;
}
