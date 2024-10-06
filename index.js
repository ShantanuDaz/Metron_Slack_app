const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { App } = require("@slack/bolt");
const { sendMessageToUser } = require("./sendNotification");

const filePath = path.join(__dirname, "secrets.json");
const jsonString = fs.readFileSync(filePath, "utf8");
const environmentVariables = JSON.parse(jsonString);

const token = environmentVariables.BOT_TOKEN;
const signingSecret = environmentVariables.SIGNING_TOKEN;
const app = new App({
  token,
  signingSecret,
});

app.action("forward_button", async ({ body, ack, say }) => {
  await ack();
  await say("Forwarding...");
  const selectedMembers =
    body.state.values.member_selection.members.selected_options.map(
      (option) => option.value
    );
  const message = body.actions[0].value;

  const sendingMessages = selectedMembers.map(async (member) => {
    try {
      await app.client.chat.postMessage({
        text: "NVD Alert",
        channel: member,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message,
            },
          },
          {
            type: "input",
            block_id: "resolution",
            element: {
              type: "plain_text_input",
              action_id: "resolution_text",
            },
            label: {
              type: "plain_text",
              text: "Please provide a fix",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Reply",
                  emoji: true,
                },
                value: message,
                action_id: "reply_back",
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error(`Error sending message to ${member}:`, error);
    }
  });

  // Wait for all messages to be sent
  await Promise.all(sendingMessages);
  await say(`Message forwarded to ${selectedMembers.length} members!`);
});

app.action("reply_back", async ({ body, ack, say }) => {
  await ack();
  await say("Replying...");
  const issues = body.actions[0].value;
  const resolution = body.state.values.resolution["resolution_text"].value;
  const message = `Issue: ${issues}\nResolution: ${resolution}`;
  try {
    await app.client.chat.postMessage({
      text: "Fixed",
      channel: environmentVariables.USER_ID,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ],
    });
    await say("Replied !");
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  await app.start(3000);
  console.log("⚡️ Slack Bolt app is running!");
})();

cron.schedule("0 * * * *", () => {
  sendMessageToUser();
  console.log("Sending message...");
});
