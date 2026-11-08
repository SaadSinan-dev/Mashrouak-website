import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface AccordionItemData {
  value: string;
  question: string;
  answer: ReactNode;
}

export function Accordion({ items }: { items: readonly AccordionItemData[] }) {
  return (
    <AccordionPrimitive.Root className="faq-accordion" type="single" collapsible>
      {items.map((item) => (
        <AccordionPrimitive.Item className="faq-item" value={item.value} key={item.value}>
          <AccordionPrimitive.Header className="faq-item__header">
            <AccordionPrimitive.Trigger className="faq-item__trigger">
              <span>{item.question}</span>
              <ChevronDown className="faq-item__chevron" size={19} aria-hidden="true" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="faq-item__content">
            <div className="faq-item__answer">{item.answer}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
