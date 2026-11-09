import Markdown from 'react-markdown';
import { safeLink } from '../../../shared/schema';

// Markdown becomes React elements. Raw HTML is escaped and unsafe protocols are rejected.
export function RichText({children}:{children:string}) {
  return <div className="rich-text"><Markdown skipHtml disallowedElements={['img','iframe','script','style']} urlTransform={url=>safeLink.safeParse(url).success?url:''} components={{a:({href,children})=><a href={href} rel="noopener noreferrer" target={href?.startsWith('https:')?'_blank':undefined}>{children}</a>}}>{children}</Markdown></div>;
}
