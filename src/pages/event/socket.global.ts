import { useSocket } from "@/src/providers/socket.provider";
import useMessageStore from "@/src/store/useMessage";
import useRoomStore from "@/src/store/useRoom";
import { useEffect } from "react";

export const SocketEventGlobal = () => {
    const { socket, status } = useSocket();
    const { upsertRoom } = useRoomStore((state) => state);
    const { upsertMessage } = useMessageStore((state) => state);
    // const messageState = useMessageStore((state) => state);
    useEffect(() => {
      if (!socket) return;
      console.log("nhận xử lý socket");
      socket.on("room:upset", upsertRoom);
      socket.on("message:upset", upsertMessage);
      socket.on("mark:readed", (data: any) => {
        console.log("nhận xử lý mark:readed", data);
      });
      return () => {
        socket.off("room:upset", () => {
            console.log("xóa xử lý room:upset");
        });
        socket.off("message:upset", (data: any) => {
          console.log("xóa xử lý message:upset", data);
        });
        socket.off("mark:readed", (data: any) => {
          console.log("xóa xử lý mark:readed", data);
        });
      };
    }, [socket]);
    return null;
};