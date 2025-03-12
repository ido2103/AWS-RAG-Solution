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
- יש להתנתק מ-ECR ואז להתחבר מחדש:
  ```bash
  docker logout <aws_account_id>.dkr.ecr.<region>.amazonaws.com

  aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <your-ecr-url>
  ```

## 2. התקנת המערכת

```bash
git clone https://github.com/ido2103/AWS-RAG-Solution
cd AWS-RAG-Solution
npm ci && npm run build
npm run cdk bootstrap  # שלב חובה לפני הפריסה
npm run deploy
```

### קובץ קונפיגורציה (config.json)

אם אין צורך לשנות את הקונפיגורציה:
```bash
cp bin/config.json dist/bin/config.json
```

אם יש צורך בשינוי קונפיגורציה:
```bash
npm run configure
cp dist/bin/config.json bin/config.json
```

## 3. הגדרת ה-Workspace

לאחר שהמערכת מותקנת, יש ליצור Workspace עם ההגדרות הבאות:

- Embedding Model: Cohere/Titan
- Data Languages: Hebrew
- Cross Encoder: None
- Chunk Size: 300
- Chunk Overlap: 100

> **הערה**: אם יש שגיאה בהפעלת ה-Workspace, יש לוודא שקיבלת הרשאה למודלים ב-Bedrock ולבדוק את ה-logs בקבוצת graphql.

## 4. יצירת יישום ושיוך ל-User Group

לאחר שה-Workspace פועל:

1. יש להיכנס ל-Admin Panel ולבחור Applications (נמצא בתפריט הצדדי)
2. יש ליצור Application ולשייך אותו ל-User Group
3. לאחר יצירת היישום, יש ללחוץ על שמו (הוא יהפוך לכחול), ואז להיכנס דרך הקישור הבא:
   ```
   https://XXXXXXX.cloudfront.net/application/YYYYYYY
   ```
   - XXXXX = CloudFront Distribution
   - YYYYY = Application ID

## 5. בדיקות איכות (Sanity Check)

- תשאול המודל ללא Workspace
- הפעלת Workspace ובדיקת תוצאות
- השוואת ביצועים בין Chunk Size 250/300, Cross Encoder On/Off
- בדיקת איכות המודלים Cohere לעומת Titan

## פתרון תקלות

### 1. AWS לא מזהה את המשתמש

שגיאת הרשאות בעת הפריסה או ההתחברות ל-ECR:
```bash
aws ecr logout
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
- יש להתחיל טרמינל חדש (CMD) ולהריץ את הפקודה שוב. אם לא עובד לנסות מספק דקות ולנסות שוב.
## סיכום

- המדריך מפרט את תהליך ההתקנה שלב אחר שלב
- פתרון תקלות מפורט למקרים נפוצים
- מומלץ לעבוד בצורה מסודרת לפי השלבים כדי להימנע מבעיות

---

### 