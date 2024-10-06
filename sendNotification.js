const { WebClient } = require("@slack/web-api");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "secrets.json");
const jsonString = fs.readFileSync(filePath, "utf8");
const environmentVariables = JSON.parse(jsonString);
const token = environmentVariables.BOT_TOKEN;
const web = new WebClient(token);

const getIssues = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const lastModEndDate = now.toISOString();
    const lastModStartDate = oneHourAgo.toISOString();
    const apiUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0/?lastModStartDate=${lastModStartDate}&lastModEndDate=${lastModEndDate}`;

    let response = await fetch(apiUrl);

    let data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
  }
};

const sendMessageToUser = async () => {
  try {
    const issues = await getIssues();
    const vulnerabilities = issues.vulnerabilities.map(
      (el) => `<https://nvd.nist.gov/vuln/detail/${el.cve.id}|${el.cve.id}>`
    );
    const nvdAlerts = vulnerabilities.join(" ,");
    const users = await getUsers();
    const msg = {
      text: "NVD Alert",
      channel: environmentVariables.USER_ID,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: nvdAlerts,
          },
        },
        {
          type: "input",
          block_id: "member_selection",
          element: {
            type: "multi_static_select",
            action_id: "members",
            placeholder: {
              type: "plain_text",
              text: "Select members",
            },
            options: users,
          },
          label: {
            type: "plain_text",
            text: "Select Members",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Forward to users",
              },
              value: nvdAlerts,
              action_id: "forward_button",
            },
          ],
        },
      ],
    };
    await web.chat.postMessage(msg);
    console.log("Message sent");
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

const getUsers = async () => {
  const result = await web.users.list();
  const users = result.members.map((user) => {
    return {
      text: {
        type: "plain_text",
        text: user.real_name,
      },
      value: user.id,
    };
  });
  return users;
};
module.exports = {
  sendMessageToUser,
};
