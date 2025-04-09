<div dir="rtl" align="right">

## תוכן עניינים

- [מערכת RAG על AWS](#מערכת-rag-על-aws)
  - [1. הכנת הסביבה](#1-הכנת-הסביבה)
    - [התחברות ל-AWS](#התחברות-ל-aws)
    - [הכנת הסביבה](#הכנת-הסביבה-1)
  - [2. התקנת המערכת](#2-התקנת-המערכת)
    - [קובץ קונפיגורציה (config.json)](#קובץ-קונפיגורציה-configjson)
    - [הפעלת המודלים](#הפעלת-המודלים)
  - [3. הגדרת המשתמשים לסביבה](#3-הגדרת-המשתמשים-לסביבה)
  - [4. הגדרת ה-Workspace](#4-הגדרת-ה-workspace)
  - [5. יצירת יישום ושיוך ל-User Group](#5-יצירת-יישום-ושיוך-ל-user-group)
  - [6. בדיקות איכות (Sanity Check)](#6-בדיקות-איכות-sanity-check)
  - [בראנצ'ים](#בראנצ'ים)
  - [קונפיגורציות](#קונפיגורציות)
  - [מודלי אמבדינג וריראנקינג](#מודלי-אמבדינג-וריראנקינג)
- [פתרון תקלות](#פתרון-תקלות)
  - [תקלות בפריסת המערכת (Deployment-Specific Problems)](#תקלות-בפריסת-המערכת-deployment-specific-problems)
    - [AWS לא מזהה את המשתמש](#1-aws-לא-מזהה-את-המשתמש)
    - [שגיאות במחיקת קבצים (permissions error)](#2-שגיאות-במחיקת-קבצים-permissions-error)
    - [cdk deploy נכשל או לוקח זמן רב](#3-cdk-deploy-נכשל-או-לוקח-זמן-רב)
    - [Error response from daemon: login attempt failed with status 400 Bad Request](#4-error-response-from-daemon-login-attempt-failed-with-status-400-bad-request)
  - [תקלות באפליקציה (Application-Specific Problems)](#תקלות-באפליקציה-application-specific-problems)
    - [בעיות עם Bedrock – קרתה תקלה ללא הסבר](#1-בעיות-עם-bedrock-–-קרתה-תקלה-ללא-הסבר)
    - [שגיאה ביצירת Workspace או שימוש במודלים](#2-שגיאה-ביצירת-workspace-או-שימוש-במודלים)
- [סיכום](#סיכום)

# מערכת RAG על AWS  
**גרסה מותאמת אישית עם דגשים מבוססי ניסיון בשטח ופתרון תקלות מפורט.**

## 1. הכנת הסביבה  

לפני תחילת ההתקנה, יש לוודא שהמערכת מוכנה לפעולה:

### התחברות ל-AWS
```bash
aws configure
```


### הכנת הסביבה
- יש לוודא ש-Docker Desktop פועל
- יש לוודא שה-CDK מעודכן:
  ```bash
  npm install -g aws-cdk
  ```
יש להתחבר ל ECR:
  ```bash
  aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin https://<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com 
  ```
- אם יש תקלה שקשורה ל STS:
- יש לערוך את קובץ ההגדרות של אמזון ולמחוק את השורה השורה של SSO

## 2. התקנת המערכת

```bash
git clone https://github.com/ido2103/AWS-RAG-Solution
cd AWS-RAG-Solution
npm ci && npm run build
```

### קובץ קונפיגורציה (config.json)
- הקונפיגורציה מחליטה איזה רכיבים יפרסו, באיזה איזור. 
- הקונפיגורציה ברירת המחדל פורסת את הפיתרון עם בדרוק באירלנד עם השם RAG.
אם אין צורך לשנות את הקונפיגורציה:
```bash
cp bin/config.json dist/bin/config.json
```

אם יש צורך בשינוי קונפיגורציה:
```bash
npm run configure
cp dist/bin/config.json bin/config.json
```
לאחר שהקונפיגורציה מוכנה, יש לסיים את התקנת המערכת:
```bash
npm run cdk bootstrap  # שלב חובה לפני הפריסה, אין צורך לעשות אותו כל פעם - רק פעם אחת. ניתן לוודא אם הוא קיים ב Cloudformation בRegion בוא אתם פועלים.
```
ללכת לתיקייה
```bash
lib/user-interface/react-app/src
```
ליצור קובץ בשם
```bash
vite-env.d.ts
קוד:
/// <reference types="vite/client" />
```

## תחילת התקנת הסביבה
### לאחר שכל ההגדרות מוכנות יש להריץ את הפקודה הבאה על מנת להתחיל בפריסת הפיתרון:
```bash
npm run cdk deploy
```

##
הפעלת המודלים
- לאחר הכנת הסביבה, יש להתחבר לבדרוק לריג'ון שבוא הפעלתם את בדרוק (ברירת המחדל eu-central-1) ולהפעיל גישה למודלים:
```bash
Gen AI Models:
Claude
Embedding Models:
Titan Text Embeddings V2
Embed Multilingual
```

## 3. הגדרת המשתמשים לסביבה
לאחר פריסת המערכת, יופיעו בקונסול הלינקים הבאים:
```bash
Outputs:
RAGGenAIChatBotStack.AuthenticationUserPoolIdF0D106F7 = UserPoolID
RAGGenAIChatBotStack.AuthenticationUserPoolLink55CE7EC4 = UserPoolLink
RAGGenAIChatBotStack.AuthenticationUserPoolWebClientId80D5526A = WebClientID
RAGGenAIChatBotStack.ChatBotApiGraphqlAPIURL702C0AD7 = GraphQLURL
RAGGenAIChatBotStack.ChatBotApiGraphqlapiIdF7B33EFE = GraphQLID
RAGGenAIChatBotStack.SharedApiKeysSecretName3D265ECA = SharedApiKeysSecret
RAGGenAIChatBotStack.UserInterfacePublicWebsiteUserInterfaceDomainName0AFFF237 = InterfaceURL
```
- יש ללחוץ על הלינק של הקוגניטו יוזר פול, וליצור לכם משתמש ולשייך אותו לקבוצת אדמין.
- לאחר מכן, יש להתחבר איתו דרך הלינק לממשק.

## 4. הגדרת ה-Workspace

לאחר שהמערכת מותקנת, יש ליצור Workspace עם ההגדרות הבאות:

- Embedding Model: Cohere/Titan
- Data Languages: Hebrew
- Cross Encoder: None
- Chunk Size: 300
- Chunk Overlap: 100

> **הערה**: אם יש שגיאה בהפעלת ה-Workspace, יש לוודא שקיבלת הרשאה למודלים ב-Bedrock ולבדוק את ה-logs בקבוצת graphql.

# לאחר יצירת הוורקספייס יש להעלות את הקבצים
- יש להיכנס לוורקספייס ולהעלות אחד מהקבצים הנתמכים.
- לאחר ההעלאה יש לחכות שהקובץ יהיה בסטטוטס Processed.
- חשוב לציין שלא קיים עדכון אוטומטי, לכן יש לרפרש כל כמה דקות.

## 5. יצירת יישום ושיוך ל-User Group

לאחר שה-Workspace פועל:

1. יש להיכנס בתפריט הצדדי תחת "אדמין" ל"יישומים"
2. יש ליצור Application ולשייך אותו ל-User Group
3. ממולץ לשנות את ערך הטמפרטורה ל0.2.
4. לאחר יצירת היישום, יש ללחוץ על שמו (הוא יהפוך לכחול), ואז להיכנס דרך הקישור הבא:
   ```
   https://XXXXXXX.cloudfront.net/application/YYYYYYY
   ```
   - XXXXX = CloudFront Distribution
   - YYYYY = Application ID

   יש לשמור את Application ID לשימוש בסעיף הבא

5. לאחר מכן, המשתמשים שהגדרתם ביישום יוכלו להתחבר לאפליקציה דרך הלינק
https://XXXXXXX.cloudfront.net/chat/application/YYYYYYY

## 6. בדיקות איכות (Sanity Check)

- תשאול המודל ללא Workspace
- הפעלת Workspace ובדיקת תוצאות
- השוואת ביצועים בין Chunk Size 250/300, Chunk Overlap, etc.
- בדיקת איכות המודלים Cohere לעומת Titan

# בראנצ'ים:
### rag-input-10-files:
- הוספה של עוד גרסאת צ'אנקינג.
- הוספה של 10 קבצים לקונטקסט המודל במקום 3.

# קונפיגורציות
## שינוי מספר התצאות שהמודל מקבל
```bash
lib/shared/layers/python-sdk/python/genai_core/langchain/workspace_retriever.py

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        logger.debug("SearchRequest", query=query)
        result = genai_core.semantic_search.semantic_search(
            self.workspace_id, query, limit=10, full_response=False
        )
```
- שינוי המספר בלימיט ישנה את כמות הקבצים שיבואו למודל קקונטקסט לשאלה.
# מודלי אמבדינג וריראנקינג:
### הדרך הכי זולה שמצאתי היא לעבור לאחד מהאיזורים הבאים ולהגדיר ריראנקינג דרך בדרוק (סייג' מייקר מאוד יקר ולא בהכרח מביא תוצאות יותר טובות, היתרון היחיד והברור הוא נימבוס).
```bash
us-west-2
ap-northeast-1
ca-central-1
eu-central-1
```
להפעלה נימבוסית, יש להפעיל מודלי סייג'מייקר
```bash
"deployDefaultSagemakerModels": false
```
# פתרון תקלות

## תקלות בפריסת המערכת (Deployment-Specific Problems)

#### 1. AWS לא מזהה את המשתמש

שגיאת הרשאות בעת הפריסה או ההתחברות ל-ECR:
```bash
docker logout <your-region>.amazonaws.com
aws configure
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-ecr-url>
```

#### 2. שגיאות במחיקת קבצים (permissions error)

במקרה של שגיאת הרשאות עם node_modules:

1. לכבות את OneDrive
2. למחוק את תיקיות node_modules:
   ```bash
   rm -rf node_modules
   rm -rf lib/user-interface/react-app/node_modules
   ```
3. להריץ מחדש את ההתקנה:
   ```bash
   npm ci && npm run build
   ```

#### 3. cdk deploy נכשל או לוקח זמן רב

התקנה של 20+ דקות היא תקינה, אך אם יש שגיאה כגון could not connect to ECR:
```bash
docker logout <your-region>.amazonaws.com
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-ecr-url>
```

#### 4. Error response from daemon: login attempt failed with status 400 Bad Request

- יש להתחיל טרמינל חדש ולהריץ את הפקודה שוב.
- אם לא עובד, להמתין מספר דקות ולנסות שוב.

## תקלות באפליקציה (Application-Specific Problems)

#### 1. בעיות עם Bedrock – קרתה תקלה ללא הסבר

- המערכת לא תציג שגיאה ברורה במקרה של חוסר הרשאה למודלים.
- יש לבדוק אם קיימת הרשאה לשימוש ב-Cohere וב-Titan ב-Bedrock.
- כדי למצוא את מקור התקלה, יש לבדוק את CloudWatch Log Group עם השם GraphQL.

#### 2. שגיאה ביצירת Workspace או שימוש במודלים

- אם קיימת שגיאה בהפעלת ה-Workspace או המודלים, ודא שקיבלת הרשאות מתאימות למודלים ב-Bedrock.
- מומלץ לבדוק את ה-Logs ב-CloudWatch תחת ה-Log Group של GraphQL.


#### 3. המסמכים שהועלו תקועים במצב Processing

- אם לוקח יותר מ10-15 דקות לעבד את הקבצים (לא רק את חלקם, הכוונה היא שאף קובץ לא מעובד), ממליץ להסתכל בקבוצת הלוגים
```bash
FileImportStateMachine
```

## סיכום

- המדריך מפרט את תהליך ההתקנה שלב אחר שלב
- פתרון תקלות מפורט למקרים נפוצים
- מומלץ לעבוד בצורה מסודרת לפי השלבים כדי להימנע מבעיות

---

### 
</div>