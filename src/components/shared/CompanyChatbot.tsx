import { MessageCircle, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../app/providers/preferences-context';

export function CompanyChatbot(){
 const {isArabic}=useLocale();
 const {pathname}=useLocation();
 if(pathname.startsWith('/contact'))return null;
 const Arrow=isArabic?ArrowUpLeft:ArrowUpRight;
 return <Link to="/contact" className="support-launcher" aria-label={isArabic?'تواصل مع مشروعك.net':'Contact Mashrouak.net'}><MessageCircle size={20} aria-hidden="true"/><span>{isArabic?'نتحدث عن مشروعك؟':'Let’s talk'}<small>{isArabic?'البريد · واتساب · المحادثة':'Email · WhatsApp · Chat'}</small></span><Arrow size={16} aria-hidden="true"/></Link>;
}
