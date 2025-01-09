const admin = require("../utils/firebase");

const sendNotificationOnMultipleDeviceTokens = async (
  deviceTokens,
  title,
  body,
  deviceType,
  roomId,
  page
) => {
  try {
    let message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        roomId,
        page,
      },
      tokens: deviceTokens,
    };
    if (deviceType == "ios") {
      message = {
        notification: {
          title: title,
          body: body,
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: body,
              },
              badge: 1,
              "mutable-content": 1,
            },
            roomId,
            page,
          },
        },
        tokens: deviceTokens,
      };
    }
    const res = await admin.messaging().sendEachForMulticast(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const sendNotificationOnTopic = async (topic, title, body, deviceType) => {
  try {
    let message = {
      notification: {
        title: title,
        body: body,
      },
      topic: topic,
    };
    if (deviceType == "ios") {
      message = {
        notification: {
          title: title,
          body: body,
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
        topic: topic,
      };
    }
    admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

module.exports = {
  sendNotificationOnMultipleDeviceTokens,
  sendNotificationOnTopic,
};
