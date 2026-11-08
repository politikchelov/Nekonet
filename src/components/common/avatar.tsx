import React from "react";
import {
  Avatar as AvatarCN,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type Props = {
  url?: string;
  username?: string;
  collectionID?: string;
  id?: string;
  className?: string;
  onClick?: () => void;
};

function Avatar({ url, username, className, onClick }: Props) {
  const src = url || undefined;

  return (
    <AvatarCN className={className} onClick={onClick}>
      <AvatarImage src={src} alt={username || "User avatar"} />
      <AvatarFallback>
        {username?.charAt(0).toUpperCase()}
        {username?.charAt(1).toLowerCase()}
      </AvatarFallback>
    </AvatarCN>
  );
}

export default Avatar;
