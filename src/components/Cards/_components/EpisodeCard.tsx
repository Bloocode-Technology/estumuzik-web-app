"use client";
import React, { useTransition } from "react";
import { FaHeart, FaPlay, FaPause } from "react-icons/fa"; // Added FaPause
import { MdPlaylistAdd } from "react-icons/md";
import { RiShareLine } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import Picture from "@/components/picture/Index";
import { useAppDispatch, useAppSelector } from "@/components/Hooks";
import { playPause, setActiveSong } from "@/components/Redux/playerOne";
import { setIsEpisodeRegistered } from "@/components/Redux/ToggleModal";
import { BaseUrl } from "@/components/utils/endpoints";
import EpisodeFavouriteFunc from "@/components/episodefunctions/EpisodeFavouriteFunc";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/components/reusables/GlobalLoader";
import EpisodeQueueListAdd from "./EpisodeQueueListAdd";
import { Tooltip } from "@heroui/react";
import EpisodePlayListAdd from "./EpisodePlayListAdd";

import { Modal, ModalContent, useDisclosure } from "@heroui/react";
import AddToPlaylistModal from "@/components/Modal/AddToPlaylistModal";

// ... (PodcastEpisode interface remains the same)

interface PodcastProps {
  data: PodcastEpisode;
  index: number; // Added to track position in list
  allEpisodes: PodcastEpisode[]; // Added to provide player queue
}

const PodcastCard = ({ data, index, allEpisodes }: PodcastProps) => {
  const dispatch = useAppDispatch();
  const { activeSong, isPlaying, isLoading } = useAppSelector(
    (state) => state.playerOne,
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const fullUrl = `${BaseUrl}/episode/${data?.id}`;
  // Helpers
  const episodeThumbnail = data?.picture_url;
  const podcastCover =
    data?.podcast.cover_picture_url || data?.podcast.picture_url;
  const category = data?.podcast.category_name;

  // Check if THIS specific card is the one playing
  const isCurrentActiveSong = activeSong?.id === data?.id;

  const {
    isOpen: isOpenAddToPlaylistModal,
    onOpen: onOpenAddToPlaylistModal,
    onOpenChange: onOpenChangeAddToPlaylistModal,
  } = useDisclosure();

  const handlePauseClick = () => {
    dispatch(playPause(false));
  };

  const handlePlayClick = () => {
    // If it's already the active song but was paused, just resume
    if (isCurrentActiveSong) {
      dispatch(playPause(true));
    } else {
      // Otherwise, load this new song and its context (allEpisodes)
      dispatch(
        setActiveSong({
          song: data,
          data: allEpisodes,
          index: index,
        }),
      );
    }
    // Reset modal states if necessary
    dispatch(setIsEpisodeRegistered(false));
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: data.description,
          url: fullUrl,
        });
      } catch (err) {
        // console.log("Share cancelled");
      }
    }
  };

  return (
    <>
      <div className="relative w-[220px] sm:w-full max-w-[340px] bg-mtn-dark-gradient rounded-2xl overflow-hidden shadow-2xl group transition-all duration-300 hover:scale-[1.02] border border-white/5">
        {/* 1. Background Image Overlay */}
        <div className="absolute top-0 left-0 w-full h-3/5 opacity-50 z-0">
          <Picture
            src={podcastCover}
            alt={data?.podcast.title}
            className="w-full h-full object-cover grayscale-[30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFCC00]/20 to-[#050505]"></div>
        </div>

        <div className="relative z-10 px-2 py-5 lg:p-5 flex flex-col justify-between h-fit lg:h-[370px]">
          <div className="relative size-28 lg:size-32 mx-auto lg:mx-0 sm:mb-6 sm:mt-4 shadow-2xl">
            <Picture
              src={episodeThumbnail}
              alt={data?.title}
              className="w-full h-full object-cover rounded-2xl border-2 border-white/10"
            />

            <div className="absolute inset-0 flex items-center justify-center">
              {isLoading && isCurrentActiveSong ? (
                <div className="size-12 rounded-full border-4 border-white/20 border-t-primary-500 animate-spin" />
              ) : (
                <button
                  onClick={
                    isCurrentActiveSong && isPlaying
                      ? handlePauseClick
                      : handlePlayClick
                  }
                  className="bg-primary-500 size-12 grid place-items-center rounded-full text-white shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-110 transition-transform cursor-pointer group-hover:bg-primary-400"
                >
                  {isCurrentActiveSong && isPlaying ? (
                    <FaPause className="text-lg" />
                  ) : (
                    <FaPlay className="text-lg ml-1" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 4. Text Content Section */}
          <div className="flex flex-col gap-1.5 mb-2">
            <span
              onClick={() =>
                startTransition(() => {
                  router.push(`/category/${data?.id}`);
                })
              }
              className="text-gray-400 text-xs font-semibold uppercase tracking-wider"
            >
              {category}
            </span>
            <h3
              onClick={() =>
                startTransition(() => {
                  router.push(`/episode/${data?.id}`);
                })
              }
              className={`${isCurrentActiveSong ? "text-primary-400" : "text-white"} hover:text-primary-400 font-bold text-lg leading-tight cursor-pointer tracking-wide line-clamp-1`}
            >
              {data?.title}
            </h3>
            <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed font-normal opacity-80">
              {data?.description}
            </p>
          </div>

          {/* 5. Action Buttons */}
          <div className="flex items-center gap-3.5">
            <EpisodeFavouriteFunc episodeData={data} />
            <EpisodePlayListAdd
              episodeData={data}
              onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
            />
            <EpisodeQueueListAdd episodeData={data} />

            <Tooltip
              content="Share Episode"
              placement="top"
              showArrow
              closeDelay={0}
              classNames={{
                base: ["before:bg-zinc-800"],
                content: [
                  "py-1.5 px-3 shadow-xl",
                  "text-[10px] font-black uppercase tracking-widest",
                  "text-white bg-zinc-900",
                  "border border-white/10 rounded-lg",
                ],
              }}
              motionProps={{
                variants: {
                  exit: { opacity: 0, transition: { duration: 0.1 } },
                  enter: { opacity: 1, transition: { duration: 0.1 } },
                },
              }}
            >
              <button
                onClick={handleNativeShare}
                className="relative size-9 sm:size-11 flex items-center justify-center rounded-full border border-white/40 text-white/60 hover:text-white/80 hover:border-white/50 transition-[.4] shrink-0 active:scale-95"
              >
                <RiShareLine className="text-xl transition-transform " />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      <Modal
        isOpen={isOpenAddToPlaylistModal}
        onOpenChange={onOpenChangeAddToPlaylistModal}
        size="md"
        backdrop="opaque"
        // isDismissable={false}
        // hideCloseButton={true}
        classNames={{
          closeButton: "z-50",
        }}
      >
        <ModalContent className="bg-black-500">
          {(onClose) => <AddToPlaylistModal episode={data} onClose={onClose} />}
        </ModalContent>
      </Modal>
      <GlobalLoader isPending={isPending} />
    </>
  );
};

export default PodcastCard;
