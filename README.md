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

##
הפעלת המודלים
- לאחר הכנת הסביבה, יש להתחבר לבדרוק ולהפעיל גישה למודלים:
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


# קונפיגורציות
## שינוי מספר התצאות שהמודל מקבל
```bash
lib/shared/layers/python-sdk/python/genai_core/langchain/workspace_retriever.py

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        logger.debug("SearchRequest", query=query)
        result = genai_core.semantic_search.semantic_search(
            self.workspace_id, query, limit=20, full_response=False
        )
```
- שינוי המספר בלימיט ישנה את כמות הקבצים שיבואו למודל קקונטקסט לשאלה.
# פתרון תקלות

### 1. AWS לא מזהה את המשתמש

שגיאת הרשאות בעת הפריסה או ההתחברות ל-ECR:
```bash
docker logout <your-region>.amazonaws.com
aws configure
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-ecr-url>
```

### 2. Docker לא מצליח לדחוף קונטיינרים ל-ECR

במקרה של שגיאת Bad Request בעת docker push:
```powershell
$env:DOCKER_BUILDKIT = "1"
$env:BUILDKIT_STEP_LOG_MAX_SIZE = "0"
```

### 3. שגיאות במחיקת קבצים (permissions error)

במקרה של שגיאת הרשאות עם node_modules:

1. לכבות את OneDrive – אחרת הבעיה תחזור שוב
2. למחוק את תיקיות node_modules:
   ```bash
   rm -rf node_modules
   rm -rf lib/user-interface/react-app/node_modules
   ```
3. להריץ מחדש את ההתקנה:
   ```bash
   npm ci && npm run build
   ```

### 4. cdk deploy נכשל או לוקח זמן רב

התקנה של 20+ דקות היא תקינה, אך אם יש שגיאה כגון could not connect to ECR:
```bash
docker logout <your-region>.amazonaws.com
aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-ecr-url>
```

### 5. בעיות עם Bedrock – קרתה תקלה ללא הסבר

- המערכת לא תציג שגיאה ברורה במקרה של חוסר הרשאה למודלים
- יש לבדוק אם קיימת הרשאה לשימוש ב-Cohere וב-Titan ב-Bedrock
- כדי למצוא את מקור התקלה, יש לבדוק את CloudWatch Log Group עם השם GraphQL


### 6. שגיאה: Error response from daemon: login attempt to https://XXXXXXX.dkr.ecr.REGION.amazonaws.com/v2/ failed with status: 400 Bad Request
- יש להתחיל טרמינל חדש ולהריץ את הפקודה שוב. אם לא עובד לנסות מספק דקות ולנסות שוב.
## סיכום

- המדריך מפרט את תהליך ההתקנה שלב אחר שלב
- פתרון תקלות מפורט למקרים נפוצים
- מומלץ לעבוד בצורה מסודרת לפי השלבים כדי להימנע מבעיות

---

### 