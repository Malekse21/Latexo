import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendDefenseFollowupEmail = async (to: string, fullName: string) => {
  const mailOptions = {
    from: `"Latexo Team" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Comment s'est passée ta soutenance ?",
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comment s'est passée ta soutenance ?</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Georgia',serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="padding-bottom:32px;" align="center">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="
                  background:#000;
                  border-radius:10px;
                  width:44px;height:44px;
                  text-align:center;
                  vertical-align:middle;
                  font-family:Georgia,serif;
                  font-size:24px;
                  font-weight:900;
                  color:#fff;
                  line-height:44px;
                  display:inline-block;
                ">L</td>
                <td style="width:10px;"></td>
                <td style="
                  font-family:Georgia,serif;
                  font-size:16px;
                  font-weight:700;
                  color:#000;
                  vertical-align:middle;
                  letter-spacing:0.5px;
                ">LATEXO</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- MAIN CARD -->
        <tr>
          <td style="
            background:#fff;
            border:1.5px solid #000;
            box-shadow:6px 6px 0 #000;
            padding:48px 44px 40px;
          ">

            <!-- Title -->
            <h1 style="
              margin:0 0 8px;
              font-family:Georgia,serif;
              font-size:36px;
              font-weight:900;
              color:#000;
              line-height:1.1;
              letter-spacing:-1px;
            ">Comment s'est<br>passée ta<br>soutenance ?</h1>

            <!-- Divider -->
            <div style="
              width:40px;height:3px;
              background:#000;
              margin:20px 0;
            "></div>

            <!-- Body -->
            <p style="
              margin:0 0 16px;
              font-family:Georgia,serif;
              font-size:15px;
              color:#333;
              line-height:1.8;
            ">On a pensé à toi le jour J.</p>

            <p style="
              margin:0 0 24px;
              font-family:Georgia,serif;
              font-size:15px;
              color:#333;
              line-height:1.8;
            ">Tu as simulé ta soutenance sur Latexo. 
            Tu as fait face à <strong>Souad</strong>, <strong>Malek</strong>, 
            et <strong>Amir</strong>. 
            Maintenant on veut savoir — <strong>est-ce que ça t'a aidé ?</strong></p>

            <!-- Score question -->
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background:#f8f8f8;
              border-left:3px solid #000;
              margin-bottom:28px;
            ">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="
                    margin:0 0 6px;
                    font-family:'Courier New',monospace;
                    font-size:9px;
                    letter-spacing:2px;
                    text-transform:uppercase;
                    color:#999;
                  ">La question qui nous tient à cœur</p>
                  <p style="
                    margin:0;
                    font-family:Georgia,serif;
                    font-size:17px;
                    font-weight:700;
                    color:#000;
                    line-height:1.4;
                  ">"Quelle note as-tu obtenue à ta soutenance ?"</p>
                </td>
              </tr>
            </table>

            <!-- CTA BUTTONS — Score options -->
            <p style="
              margin:0 0 14px;
              font-family:'Courier New',monospace;
              font-size:9px;
              letter-spacing:2px;
              text-transform:uppercase;
              color:#999;
            ">Clique sur ta mention</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Très Bien -->
                <td width="31%" style="padding-right:8px;">
                  <a href="https://latexo.tn/feedback?result=tres-bien&utm_source=email&utm_campaign=post-defense"
                     style="
                       display:block;
                       background:#000;
                       color:#fff;
                       text-decoration:none;
                       text-align:center;
                       padding:14px 8px;
                       font-family:'Courier New',monospace;
                       font-size:10px;
                       font-weight:700;
                       letter-spacing:1px;
                       text-transform:uppercase;
                       border:2px solid #000;
                     ">
                    ✦ Très Bien<br>
                    <span style="font-size:9px;font-weight:400;opacity:0.7">16–20</span>
                  </a>
                </td>
                <!-- Bien -->
                <td width="31%" style="padding-right:8px;">
                  <a href="https://latexo.tn/feedback?result=bien&utm_source=email&utm_campaign=post-defense"
                     style="
                       display:block;
                       background:#fff;
                       color:#000;
                       text-decoration:none;
                       text-align:center;
                       padding:14px 8px;
                       font-family:'Courier New',monospace;
                       font-size:10px;
                       font-weight:700;
                       letter-spacing:1px;
                       text-transform:uppercase;
                       border:2px solid #000;
                     ">
                    Bien<br>
                    <span style="font-size:9px;font-weight:400;opacity:0.5">14–15</span>
                  </a>
                </td>
                <!-- Passable -->
                <td width="38%">
                  <a href="https://latexo.tn/feedback?result=passable&utm_source=email&utm_campaign=post-defense"
                     style="
                       display:block;
                       background:#fff;
                       color:#000;
                       text-decoration:none;
                       text-align:center;
                       padding:14px 8px;
                       font-family:'Courier New',monospace;
                       font-size:10px;
                       font-weight:700;
                       letter-spacing:1px;
                       text-transform:uppercase;
                       border:2px solid #000;
                     ">
                    Passable / Autre<br>
                    <span style="font-size:9px;font-weight:400;opacity:0.5">10–13</span>
                  </a>
                </td>
              </tr>
            </table>

            <!-- Separator -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td style="border-top:1px solid #eee;"></td>
              </tr>
            </table>

            <!-- Open question -->
            <p style="
              margin:0 0 12px;
              font-family:Georgia,serif;
              font-size:15px;
              color:#333;
              line-height:1.7;
            ">On veut aussi savoir <strong>ce que tu as vraiment vécu</strong> — les questions du jury, le moment qui t'a surpris, ce que Latexo t'a préparé et ce qu'il ne t'a pas préparé.</p>

            <p style="
              margin:0 0 24px;
              font-family:Georgia,serif;
              font-size:14px;
              color:#777;
              line-height:1.7;
              font-style:italic;
            ">Deux minutes. Aucun formulaire. Juste une réponse à cet email.</p>

            <!-- Reply CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="
                  background:#fff;
                  border:2px solid #000;
                  box-shadow:3px 3px 0 #000;
                ">
                  <a href="mailto:latexo.students@gmail.com?subject=Ma soutenance PFE — retour Latexo&body=Bonjour,%0A%0AJ'ai passé ma soutenance et voici mon retour sur Latexo :%0A%0ANote obtenue :%0A%0ACe que Latexo m'a bien préparé :%0A%0ACe qui m'a surpris en vrai soutenance :%0A%0ACe que je changerais dans Latexo :%0A%0AMerci"
                     style="
                       display:block;
                       padding:14px 28px;
                       font-family:'Courier New',monospace;
                       font-size:11px;
                       font-weight:700;
                       letter-spacing:2px;
                       text-transform:uppercase;
                       color:#000;
                       text-decoration:none;
                     ">
                    Répondre à cet email →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Personal note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background:#000;
              margin-bottom:0;
            ">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="
                    margin:0 0 6px;
                    font-family:'Courier New',monospace;
                    font-size:9px;
                    letter-spacing:2px;
                    text-transform:uppercase;
                    color:#555;
                  ">Un mot du fondateur</p>
                  <p style="
                    margin:0;
                    font-family:Georgia,serif;
                    font-size:13px;
                    color:#aaa;
                    line-height:1.8;
                    font-style:italic;
                  ">"J'ai construit Latexo parce que personne ne préparait vraiment les étudiants à la soutenance. Ton retour — qu'il soit positif ou négatif — est ce qui me permet de le rendre meilleur pour le prochain qui passera après toi."</p>
                  <p style="
                    margin:12px 0 0;
                    font-family:'Courier New',monospace;
                    font-size:10px;
                    color:#444;
                    letter-spacing:1px;
                  ">— Fondateur, Latexo</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:28px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="
                  font-family:'Courier New',monospace;
                  font-size:9px;
                  color:#bbb;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  line-height:1.8;
                ">
                  LATEXO · Simulateur de Soutenance PFE<br>
                  <a href="https://latexo.tn" style="color:#bbb;text-decoration:none;">latexo.tn</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return { success: false, error };
  }
};
