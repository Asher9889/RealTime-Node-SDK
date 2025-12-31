| Aspect               | `receive_cmd`      | `realtime_glog` |
| -------------------- | ------------------ | --------------- |
| Who initiates        | Device             | Device          |
| Why                  | Ask for commands   | Send attendance |
| Protocol section     | §2.1               | §4.1            |
| Contains attendance? | ❌ No               | ✅ Yes           |
| Contains binary?     | ❌ No               | ⚠️ Optional     |
| Server must respond  | Yes                | Yes             |
| Server action        | Send command or OK | Save log        |
| Frequency            | Periodic           | Event-based     |
