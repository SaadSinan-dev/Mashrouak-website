import { useLocale } from "../../app/providers/preferences-context";
import { Container } from "../../components/ui/Container";
import { useSEO } from "../../lib/seo";

export function PrivacyPage() {
  const { t, isArabic: ar } = useLocale();
  useSEO({
    title: t("footer.privacy"),
    description: t("privacy.lead"),
    path: "/privacy",
  });
  const sections: Array<[string, string]> = ar
    ? [
        [
          "المعلومات التي تقدمها",
          "يتضمن استفسار المشروع الاسم والبريد الإلكتروني والخدمة ووصف الفكرة والتفاصيل الاختيارية التي تدخلها. تجمع المحادثة اسمك والبريد الاختياري والرسائل التي ترسلها بعد موافقتك على الحفظ. تجنب كلمات المرور وبيانات الدفع والمعلومات الحساسة.",
        ],
        [
          "الاستخدام وقنوات الإرسال",
          "نستخدم البيانات لفهم طلبك والرد عليه. يحفظ نموذج التواصل طلبك في صندوق الدعم عند توافر الخادم؛ وإذا تعذّر الوصول إليه يعرض خيار مسودة بريد وتبقى مسؤولاً عن إرسالها. روابط البريد وواتساب وإنستغرام تفتح خدمات خارجية تخضع لسياساتها. لا يعني حفظ الطلب إرسال بريد إلكتروني.",
        ],
        [
          "المحادثات والتخزين",
          "تُحفظ المحادثات والرسائل لدى خدمة الموقع على Cloudflare D1، وتُحفظ الصور المرفوعة من المسؤولين على Cloudinary. يستطيع الموظفون المصرح لهم مراجعة الرسائل والرد عليها. الإعداد الافتراضي يحذف المحادثات بعد 90 يوماً من آخر تحديث عبر مهمة كل ساعة، وقد تستغرق الإزالة ساعة إضافية. على المشغّل الإفصاح عن أي تغيير لهذه المدة قبل النشر.",
        ],
        [
          "المساعد الاختياري",
          "مساعد الذكاء الاصطناعي غير مفعّل افتراضياً. عند تفعيله، يظهر زر واضح لطلب إجابة آلية؛ ويرسل استخدامه سياق الرسائل الأخيرة ومعرفة الشركة المعتمدة إلى المزوّد الذي يختاره المشغّل. تُوسم الإجابة بأنها آلية ويمكن طلب متابعة بشرية. يجب الإفصاح عن المزوّد وسياسة احتفاظه قبل تفعيل هذه الخدمة للزوار.",
        ],
        [
          "ملفات الارتباط والتفضيلات",
          "يستخدم الموقع ملف ارتباط ضرورياً وآمناً من وصول JavaScript لاستعادة محادثة هذا المتصفح، مدته 30 يوماً؛ وانتهاؤه لا يعني حذف الرسائل فوراً. تستخدم لوحة الإدارة جلسة منفصلة مدتها 8 ساعات. تُحفظ اللغة والمظهر محلياً. لا تُفعّل أدوات إعلان أو تتبع افتراضياً.",
        ],
        [
          "الأمان والحقوق",
          "تُقيد صلاحيات الإدارة والدعم حسب الدور، ولا تظهر المحادثات للزوار الآخرين. لا ترسل معلومات حساسة عبر المحادثة. لطلب الوصول إلى بياناتك أو تصحيحها أو حذفها، راسل mashrouak.net@gmail.com أو واتساب +963 937 254 833 مع تفاصيل تساعد على تحديد طلبك. تعتمد المتطلبات القانونية على الولاية المعتمدة لدى المشغّل.",
        ],
        [
          "المشغّل والتحديثات",
          "قنوات التواصل الرسمية: mashrouak.net@gmail.com، واتساب +963 937 254 833، وإنستغرام @mashrouak_net. لم تُقدَّم بيانات كيان قانوني مسجّل أو عنوان أو ولاية قضائية؛ يجب استكمال هذه المعلومات قبل الإطلاق العام.",
        ],
      ]
    : [
        [
          "Information you provide",
          "Project enquiries include your name, email, service, description and the optional details you enter. Chat collects your name, optional email and messages after you consent to storage. Avoid passwords, payment details and sensitive information.",
        ],
        [
          "Use and submission channels",
          "We use information to understand and answer your request. The contact form saves enquiries to the support inbox when the server is available. If it cannot connect, an email-draft option leaves the sending decision with you. Email, WhatsApp and Instagram open external services governed by their own policies. Saving an enquiry does not send an email.",
        ],
        [
          "Conversations and storage",
          "Conversations and messages are stored in the site’s Cloudflare D1 database; administrator image uploads use Cloudinary. Authorized staff can review and reply to messages. The default hourly cleanup removes conversations 90 days after their last update, with up to one additional hour for cleanup. The operator must disclose changes to this period before publication.",
        ],
        [
          "Optional AI assistant",
          "AI is disabled by default. When configured, an explicit button requests an AI answer and sends recent message context and approved company knowledge to the operator’s selected provider. Answers are labeled as AI and human follow-up remains available. The operator must identify the provider and its retention policy before enabling this feature for visitors.",
        ],
        [
          "Cookies and preferences",
          "An essential HttpOnly cookie restores this browser’s conversation for 30 days. Cookie expiry does not immediately delete messages. Administration uses a separate eight-hour session. Language and appearance preferences are stored locally. Advertising and tracking tools are disabled by default.",
        ],
        [
          "Security and your requests",
          "Administration and support access are restricted by role. Other visitors cannot access your conversation. Do not send sensitive information through chat. To request access, correction or deletion, contact mashrouak.net@gmail.com or WhatsApp +963 937 254 833 with details that identify your enquiry. Applicable legal requirements depend on the operator’s jurisdiction.",
        ],
        [
          "Operator and updates",
          "Official contacts: mashrouak.net@gmail.com, WhatsApp +963 937 254 833 and Instagram @mashrouak_net. A registered entity, physical address and jurisdiction have not been supplied. These operator details must be completed before public launch.",
        ],
      ];
  return (
    <section className="privacy-page legal-page section-space">
      <Container>
        <p className="eyebrow">{t("privacy.eyebrow")}</p>
        <h1>{t("privacy.title")}</h1>
        <p className="privacy-page__lead">{t("privacy.lead")}</p>
        <div className="privacy-page__body legal-page__sections">
          {sections.map(([title, body], index) => (
            <section className="legal-section" key={title}>
              <span className="legal-section__number" dir="ltr">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </section>
          ))}
        </div>
        <p className="privacy-page__updated">
          {ar ? "آخر تحديث: نوفمبر 2026" : "Updated: November 2026"}
        </p>
      </Container>
    </section>
  );
}
