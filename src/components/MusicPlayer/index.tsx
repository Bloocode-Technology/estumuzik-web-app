"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import { useDispatch } from "react-redux";
// import Player from "./Player";\
import { useAppSelector } from "../Hooks";
import {
  setIsEpisodeRegistered,
  setIsLikedEpisode,
  setIsRemoveLikeEpisode,
  toggleLoginModal,
  toggleSocialShareModal,
  toggleTipsModal,
  setIsMinimizedPlayer,
} from "../Redux/ToggleModal";
import {
  nextSong,
  playPause,
  prevSong,
  setIsLoadingSong,
  setVolume,
} from "../Redux/playerOne";
import CustomRangeInput from "../input/CustomRangeInput";
import { MdReplay30, MdOutlineForward30 } from "react-icons/md";
import { RotatingLines, ColorRing } from "react-loader-spinner";
import { AiOutlineStepForward } from "react-icons/ai";
import {
  BsArrowRepeat,
  BsFillHeartFill,
  BsFillPauseFill,
  BsShuffle,
} from "react-icons/bs";
import { FaShareAlt } from "react-icons/fa";
import { CiMinimize1 } from "react-icons/ci";
import { motion } from "framer-motion";
import { IoMdDownload } from "react-icons/io";
import { useMutation } from "react-query";
// import {
// 	addToQueue,
// 	likeEpisode,
// 	registerPlayEpisode,
// 	removeLikeEpisode,
// } from "@/api/Auth";
import { TbArrowsMaximize, TbArrowsMinimize } from "react-icons/tb";
import LikeButton from "../actions/LikeButton";
import QueueButton from "../actions/QueueButton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ShareButton from "../actions/ShareButton";
import Picture from "../picture/Index";
import { APICall } from "../utils/extra";
import TooltipWrapper from "../common/TooltipWrapper";
import { SvgPlayIcon } from "../utils/svgIcons";
import VolumeBar from "./VolumeBar";
import CustomRangeVolume from "./CustomRangeVolume";
import Player from "./Player";
import { loadingBarRef } from "@/app/redux-provider";
import Cookies from "js-cookie";
import { AUTH_TOKEN_KEY, hasSignedOut } from "../utils/data";
import EpisodeFavouriteFunc from "../episodefunctions/EpisodeFavouriteFunc";
import EpisodeQueueListAdd from "../Cards/_components/EpisodeQueueListAdd";
import { BaseUrl, registerPlayEpisode } from "../utils/endpoints";
import { RiShareLine } from "react-icons/ri";
import { Modal, ModalContent, Tooltip, useDisclosure } from "@heroui/react";
import EpisodePlayListAdd from "../Cards/_components/EpisodePlayListAdd";
import AddToPlaylistModal from "../Modal/AddToPlaylistModal";

const MusicPlayer: React.FC = () => {
  const {
    activeSong,
    currentSongs,
    currentIndex,
    isActive,
    isPlaying,
    volume,
    isLoading,
  } = useAppSelector((state) => state.playerOne);
  const { user } = useAppSelector((state: any) => state.auth);

  const cookie = Cookies.get(AUTH_TOKEN_KEY);
  const { likedEpisodes, isEpisodeRegistered, isMinimizedPlayer } =
    useAppSelector((state) => state.toggleModal);
  const [duration, setDuration] = useState<number>(0);
  const [seekTime, setSeekTime] = useState<number>(0);
  const [appTime, setAppTime] = useState<number>(0);
  const [repeat, setRepeat] = useState<boolean>(false);
  //   const [isMinimizedPlayer, setIsMinimizedPlayer] = useState(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [checkpoint, setCheckPoint] = useState<number>(0);
  const dispatch = useDispatch();
  const getTime = (time: any) =>
    `${Math.floor(time / 60)}:${`0${Math.floor(time % 60)}`.slice(-2)}`;
  const {
    isOpen: isOpenAddToPlaylistModal,
    onOpen: onOpenAddToPlaylistModal,
    onOpenChange: onOpenChangeAddToPlaylistModal,
  } = useDisclosure();
  //   my code begins here

  useEffect(() => {
    //   Load the player state from localStorage when the component mounts
    const storedPlayerState = localStorage.getItem("playerState");
    localStorage.setItem("isEpisodePlaying", "false");
    if (storedPlayerState) {
      const parsedPlayerState = JSON.parse(storedPlayerState);
      dispatch(playPause(false));
      // setVolume(parsedPlayerState.volume);
      setSeekTime(parsedPlayerState.seekTime);
    }
  }, []);

  const pathName = usePathname();

  //   useEffect(() => {
  //     localStorage.setItem("appTime", appTime.toString());
  //     return () => {};
  //   }, [appTime]);

  useEffect(() => {
    let checkPointTime = localStorage.getItem("checkpoint");
    if (checkPointTime) {
      setCheckPoint(parseInt(checkPointTime));

      //   setInterval(() => {
      //     localStorage.setItem("checkpoint", "0");
      //   }, 5000);
    }
    return () => {
      if (appTime > 5) {
        localStorage.setItem("checkpoint", appTime.toString());
      } else {
        setCheckPoint(0);
      }
    };
  }, [pathName, isPlaying, playPause, appTime]);

  useEffect(() => {
    const episodeIsPlaying = localStorage.getItem("isEpisodePlaying");
    if (checkpoint > 5) {
      if (episodeIsPlaying === "true") {
        playPause(true);
      } else {
        playPause(false);
      }
    }
    return () => {};
  }, []);
  // console.log(duration, "duration");

  useEffect(() => {
    let myTime = localStorage.getItem("appTime");

    if (myTime) {
      if (parseInt(myTime) > 5) {
        // localStorage.setItem("checkpoint", myTime.toString());
        localStorage.setItem("checkpoint", appTime.toString());
      }
    }
  }, [playPause, isPlaying, appTime]);

  //   my code ends here
  const onScrubVolume = (value: number) => {
    // setVolume(value * 100);
    dispatch(setVolume(value / 100));
  };

  useEffect(() => {
    if (currentSongs.length) dispatch(playPause(true));
  }, [currentIndex]);

  useEffect(() => {
    const playerState = {
      isPlaying: false,
      volume,
      seekTime: appTime,
    };
    localStorage.setItem("playerState", JSON.stringify(playerState));
  }, [isPlaying, volume, seekTime, appTime]);

  // plays api setup
  const registerPlayMutation = useMutation(
    (episodeId?: number | string) =>
      APICall(registerPlayEpisode, [episodeId], false, false),
    {
      onSuccess: () => {
        // Handle success if needed
      },
    },
  );

  // I want to use this functionality to register an episode as played when the track time is 15%. I only want to register an episode as played once the when another track is played register it again as play also when a track is replayed register it as another play
  const handleRegisterPlay = async (episodeId?: number) => {
    try {
      await registerPlayMutation.mutateAsync(episodeId);
    } catch (error: any) {}
  };

  const handlePlayPause = () => {
    if (!isActive) return;

    if (isPlaying) {
      dispatch(playPause(false));
      localStorage.setItem("isEpisodePlaying", "false");
    } else {
      dispatch(playPause(true));
      localStorage.setItem("isEpisodePlaying", "true");
      // Reset the episodeRegistered state when a new track is played or when the current track is replayed
      // setEpisodeRegistered(false);
    }
  };

  const handleNextSong = () => {
    dispatch(playPause(false));
    dispatch(setIsEpisodeRegistered(false));

    // --- RESET TIME LOGIC ---
    setAppTime(0);
    setSeekTime(0);
    localStorage.setItem("checkpoint", "0"); // Clear the resume point for the next track
    // -------------------------

    if (!shuffle) {
      dispatch(nextSong((currentIndex + 1) % currentSongs.length));
    } else {
      dispatch(nextSong(Math.floor(Math.random() * currentSongs.length)));
    }
  };

  const handlePrevSong = () => {
    dispatch(setIsEpisodeRegistered(false));

    // --- RESET TIME LOGIC ---
    setAppTime(0);
    setSeekTime(0);
    localStorage.setItem("checkpoint", "0");
    // -------------------------

    if (currentIndex === 0) {
      dispatch(prevSong(currentSongs.length - 1));
    } else if (shuffle) {
      dispatch(prevSong(Math.floor(Math.random() * currentSongs.length)));
    } else {
      dispatch(prevSong(currentIndex - 1));
    }
  };

  const onScrub = (value: number) => {
    // Just update the UI time
    const newTime = (value / 100) * duration;
    setAppTime(newTime);
  };

  const onScrubEnd = (value: number) => {
    // Actually jump the audio engine
    const newTime = (value / 100) * duration;
    setSeekTime(newTime);
  };
  const rewind30Secs = () => {
    setSeekTime(appTime - 30);
  };
  const handleRepeatClick = () => {
    setRepeat((prev: any) => !prev);
    if (repeat) {
      dispatch(setIsEpisodeRegistered(false));
    }
  };

  const fastForward30Secs = () => {
    setSeekTime(appTime + 30);
  };

  // Like functions and api call
  const handleLikeEpisode = async (episodeId: number | string) => {
    try {
      // Optimistic update
      // Use the mutate function provided by useMutation
      dispatch(setIsLikedEpisode(episodeId));
      // await likeEpisodeMutation.mutateAsync(episodeId);
    } catch (error: any) {
      // Revert the change if the mutation fails

      if (
        error.response.data.message === "This episode has already been liked."
      ) {
        // Handle the case when the episode has already been liked
        dispatch(setIsLikedEpisode(episodeId));
      }
    }
  };

  const fullUrl = `${BaseUrl}/episode/${activeSong?.id}`;
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeSong?.title,
          text: activeSong?.description,
          url: fullUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  return (
    <>
      {!pathName.startsWith("/auth/") && (
        <>
          {isMinimizedPlayer ? (
            <motion.div
              initial={{ opacity: 0, y: 100 }} // Initial position and opacity
              animate={{ opacity: 1, y: 0 }} // Animation target
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className={`flex flex-col w-[23rem] px-2 pt-2 pb-3 h-fit animate-slideup bg-gradient-to-br from-white/10 to-primary-100/60 backdrop-blur-lg fixed bottom-0 right-0 z-40 ${
                activeSong ? "visible" : "invisible"
              }`}
            >
              <div className="grid grid-cols-3 w-full mt-1">
                <div className="flex">
                  <TooltipWrapper content="Maximize" position="top">
                    <TbArrowsMaximize
                      onClick={() => dispatch(setIsMinimizedPlayer())}
                      size={15}
                      color="#FFF3E6"
                      className="cursor-pointer hover:scale-125 transition-[.4]"
                    />
                  </TooltipWrapper>
                  {activeSong?.picture_url ? (
                    <div
                      className={`relative ${
                        isPlaying && isActive
                          ? "animate-[spin_3s_linear_infinite]"
                          : ""
                      } w-fit h-fit flex items-center justify-center`}
                    >
                      <Picture
                        className="!w-[60px] !h-[60px] rounded-full border-2 border-primary-50 object-cover"
                        src={activeSong?.picture_url}
                        alt={activeSong?.title}
                      />
                    </div>
                  ) : (
                    <div className="bg-zinc-300 h-[60px] rounded-full" />
                  )}
                </div>

                <div className="flex gap-4 items-center justify-center">
                  <TooltipWrapper content="Prev" position="top">
                    <AiOutlineStepForward
                      color="#fff"
                      size={20}
                      className={`rotate-180 cursor-pointer`}
                      onClick={handlePrevSong}
                    />
                  </TooltipWrapper>

                  {isLoading ? (
                    <button className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition">
                      <ColorRing
                        visible={true}
                        height="40"
                        width="40"
                        ariaLabel="blocks-loading"
                        wrapperStyle={{}}
                        wrapperClass="blocks-wrapper"
                        colors={[
                          "#FF6A00",
                          "#FF8C1A",
                          "#FFA94D",
                          "#7a6d21",
                          "#FF9340",
                        ]}
                      />
                    </button>
                  ) : (
                    <>
                      {isPlaying ? (
                        <TooltipWrapper content="Pause" position="top">
                          <button
                            className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                            onClick={handlePlayPause} // help create a function that will trigger plays api when player time percentage is 15%
                          >
                            <BsFillPauseFill size={32} color="#fff" />
                          </button>
                        </TooltipWrapper>
                      ) : (
                        <TooltipWrapper content="Play" position="top">
                          <button
                            className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                            onClick={handlePlayPause}
                          >
                            <SvgPlayIcon className="h-6 w-6" />
                          </button>
                        </TooltipWrapper>
                      )}
                    </>
                  )}

                  <TooltipWrapper content="Next" position="top">
                    <AiOutlineStepForward
                      color="#fff"
                      size={20}
                      className="cursor-pointer"
                      onClick={handleNextSong}
                    />
                  </TooltipWrapper>
                </div>

                <div className="flex items-center justify-end">
                  <VolumeBar
                    value={volume}
                    min="0"
                    max="1"
                    onChange={(e) =>
                      dispatch(setVolume(parseFloat(e.target.value)))
                    }
                    isMinimized={isMinimizedPlayer}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <div
                className={`lg:flex flex-col w-full h-fit animate-slideup bg-gradient-to-br from-white/10 to-primary-100/60 backdrop-blur-lg fixed bottom-0 z-40 hidden ${
                  activeSong ? "visible" : "invisible"
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 100 }} // Initial position and opacity
                  animate={{ opacity: 1, y: 0 }} // Animation target
                  transition={{ type: "spring", damping: 15, stiffness: 100 }} // Spring animation
                >
                  <div className="flex items-center w-full px-8 pt-2">
                    <div className="flex items-center w-full gap-4 text-[#D0D5DD] text-sm">
                      <span className="w-7">
                        {appTime === 0 ? "0:00" : getTime(appTime)}
                      </span>
                      <div className="flex-1 flex w-full item-center">
                        <CustomRangeInput
                          // Logic: Pass the calculated percentage (0-100)
                          sliderValue={(appTime / duration) * 100}
                          // Handlers
                          onChange={onScrub}
                          onAfterChange={onScrubEnd}
                          // Limits: Since sliderValue is 0-100, maxValue must be 100
                          minValue={0}
                          maxValue={100}
                          // --- MTN BRAND STYLING ---
                          backgroundColor="#2D2D2D" // Deep charcoal background for the track
                          sliderColor="#FFCC00" // Iconic MTN Yellow for the progress fill
                          circleColor="#FFCC00" // Iconic MTN Yellow for the seeker dot
                          // Dimensions
                          width="w-full"
                          height="h-1" // Sleeker thin bar (standard for music apps)
                        />
                      </div>
                      <span className="w-7">
                        {duration === 0 ? "0:00" : getTime(duration)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 w-full xl:px-8 px-2 mt-1 pb-2">
                    <div className="col-span-1 flex shrink-0 gap-3 items-center">
                      <>
                        {activeSong?.picture_url ? (
                          <div
                            className={`relative ${
                              isPlaying && isActive
                                ? "animate-[spin_3s_linear_infinite]"
                                : ""
                            } w-fit h-fit flex items-center justify-center`}
                          >
                            <Picture
                              className="!w-[60px] !h-[60px] rounded-full border-2 border-primary-50 object-cover"
                              src={activeSong?.picture_url}
                              alt={activeSong?.title}
                            />
                            {/* <div className='bg-gradient-to-br from-white/10 to-primary-100/60 backdrop-blur-lg !w-[20px] !h-[20px] rounded-full absolute top-5' /> */}
                          </div>
                        ) : (
                          <div className="bg-zinc-300 h-[60px] rounded-full" />
                        )}
                      </>
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/episode/${activeSong?.id}`}
                          title={activeSong?.title}
                          className="text-sm text-white/80 cursor-pointer tracking-wide w-[16rem] xl:w-[20rem] overflow-hidden overflow-ellipsis hover:text-[#1e2531] transition-[.4] truncate"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {activeSong?.title}
                        </Link>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center justify-center">
                      <TooltipWrapper content="Repeat" position="top">
                        <BsArrowRepeat
                          color={repeat ? "red" : "white"}
                          size={20}
                          onClick={handleRepeatClick}
                          className="cursor-pointer"
                        />
                      </TooltipWrapper>
                      <TooltipWrapper content="Replay 30" position="top">
                        <MdReplay30
                          color="#fff"
                          size={20}
                          onClick={rewind30Secs}
                          className={`cursor-pointer`}
                          // className={`${
                          // 	appTime < 30
                          // 		? "cursor-not-allowed"
                          // 		: "cursor-pointer"
                          // }`}
                        />
                      </TooltipWrapper>
                      <TooltipWrapper content="Prev" position="top">
                        <AiOutlineStepForward
                          color="#fff"
                          size={20}
                          className={`rotate-180 cursor-pointer`}
                          onClick={handlePrevSong}
                        />
                      </TooltipWrapper>

                      {isLoading ? (
                        <button className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition">
                          <ColorRing
                            visible={true}
                            height="40"
                            width="40"
                            ariaLabel="blocks-loading"
                            wrapperStyle={{}}
                            wrapperClass="blocks-wrapper"
                            colors={[
                              "#FF6A00",
                              "#FF8C1A",
                              "#FFA94D",
                              "#7a6d21",
                              "#FF9340",
                            ]}
                          />
                        </button>
                      ) : (
                        <>
                          {isPlaying ? (
                            <TooltipWrapper content="Pause" position="top">
                              <button
                                className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                                onClick={handlePlayPause}
                              >
                                <BsFillPauseFill size={32} color="#fff" />
                              </button>
                            </TooltipWrapper>
                          ) : (
                            <TooltipWrapper content="Play" position="top">
                              <button
                                className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                                onClick={handlePlayPause}
                              >
                                <SvgPlayIcon className="h-6 w-6" />
                              </button>
                            </TooltipWrapper>
                          )}
                        </>
                      )}

                      <TooltipWrapper content="Next" position="top">
                        <AiOutlineStepForward
                          color="#fff"
                          size={20}
                          className="cursor-pointer"
                          onClick={handleNextSong}
                        />
                      </TooltipWrapper>

                      <TooltipWrapper content="Forward 30" position="top">
                        <MdOutlineForward30
                          size={24} // Slightly larger for better touch/click target
                          onClick={
                            activeSong && activeSong?.duration - appTime >= 30
                              ? fastForward30Secs
                              : undefined
                          }
                          className={`transition-all duration-200 
			${
        activeSong && activeSong?.duration - appTime < 30
          ? "text-gray-600 cursor-not-allowed opacity-50"
          : "text-white hover:text-[#FFCC00] cursor-pointer hover:scale-110 active:scale-95"
      }`}
                        />
                      </TooltipWrapper>
                      <TooltipWrapper content="Shuffle" position="top">
                        <BsShuffle
                          color={shuffle ? "red" : "white"}
                          size={20}
                          onClick={() => setShuffle((prev: any) => !prev)}
                          className="cursor-pointer"
                        />
                      </TooltipWrapper>
                    </div>

                    <div className="flex gap-2 items-center justify-end">
                      <div className="flex gap-4 items-center">
                        <TooltipWrapper content="Minimize" position="top">
                          <TbArrowsMinimize
                            onClick={() => dispatch(setIsMinimizedPlayer())}
                            size={20}
                            color={"#D0D5DD"}
                            className="cursor-pointer hover:scale-75 transition-[.4]"
                          />
                        </TooltipWrapper>
                        {activeSong && (
                          <>
                            <EpisodeFavouriteFunc
                              episodeData={activeSong}
                              className="size-9"
                            />

                            <EpisodeQueueListAdd
                              episodeData={activeSong}
                              className="size-9"
                            />

                            <EpisodePlayListAdd
                              episodeData={activeSong}
                              onOpenAddToPlaylistModal={
                                onOpenAddToPlaylistModal
                              }
                            />
                          </>
                        )}

                        <Tooltip
                          content="Share Episode"
                          placement="top"
                          showArrow
                          closeDelay={0}
                          // Technical styling (Zinc + Industrial Typography)
                          classNames={{
                            base: ["before:bg-zinc-800"], // Arrow color
                            content: [
                              "py-1.5 px-3 shadow-xl",
                              "text-[10px] font-black uppercase tracking-widest",
                              "text-white bg-zinc-900",
                              "border border-white/10 rounded-lg",
                            ],
                          }}
                          // Snappy spring animation
                          motionProps={{
                            variants: {
                              exit: {
                                opacity: 0,
                                transition: { duration: 0.1 },
                              },
                              enter: {
                                opacity: 1,
                                transition: { duration: 0.1 },
                              },
                            },
                          }}
                        >
                          <button
                            onClick={handleNativeShare}
                            className="relative size-11 flex items-center justify-center rounded-full border border-white/40 hover:bg-white/10 text-white/60 hover:text-white hover:border-white/50 transition-all shrink-0 active:scale-95"
                          >
                            {/* The Icon */}
                            <RiShareLine className="text-xl transition-transform " />

                            {/* Hardware Reflection Effect */}

                            {/* Subtle Hover Glow */}
                          </button>
                        </Tooltip>
                      </div>
                      <div className="ml-2">
                        <CustomRangeVolume
                          sliderValue={volume * 100}
                          onChange={onScrubVolume}
                          onAfterChange={onScrubEnd}
                          minValue={0}
                          maxValue={100}
                          setVolume={(val) => dispatch(setVolume(val))}
                          backgroundColor="#333333"
                          sliderColor="#FFCC00"
                          circleColor="#FFCC00"
                          width="w-[4.5rem]"
                          height="h-[3px]"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* mobile */}
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
                className={`flex flex-col px-1 pt-2 pb-3 h-fit animate-slideup bg-gradient-to-br from-white/10 to-primary-100/60 backdrop-blur-lg fixed bottom-0 right-0 z-40 lg:hidden w-full ${
                  activeSong ? "visible" : "invisible"
                }`}
              >
                <div className="flex items-center w-full px-1 pb-1">
                  <div className="flex items-center w-full gap-2 text-[#D0D5DD] text-xs">
                    <span className="w-7 flex justify-end items-center">
                      {appTime === 0 ? "0:00" : getTime(appTime)}
                    </span>
                    <div className="flex-1 flex w-full item-center">
                      <CustomRangeInput
                        sliderValue={(appTime / duration) * 100}
                        onChange={onScrub}
                        onAfterChange={onScrubEnd}
                        minValue={0}
                        maxValue={100}
                        backgroundColor="#2D2D2D"
                        sliderColor="#FFCC00"
                        width="w-full"
                        height="h-1"
                      />
                    </div>
                    <span className="w-7 flex items-center">
                      {duration === 0 ? "0:00" : getTime(duration)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 w-full mt-1 px-1">
                  <div className="col-span-2 flex items-center gap-2">
                    {activeSong?.picture_url ? (
                      <div
                        className={`relative ${
                          isPlaying && isActive
                            ? "animate-[spin_3s_linear_infinite]"
                            : ""
                        } w-fit h-fit flex items-center justify-center`}
                      >
                        <Picture
                          className="!w-[60px] !h-[60px] rounded-full border-2 border-primary-50 object-cover"
                          src={activeSong?.picture_url}
                          alt={activeSong?.title}
                        />
                      </div>
                    ) : (
                      <div className="bg-zinc-300 h-[60px] rounded-full" />
                    )}
                    <div className="flex flex-col gap-1 relative">
                      <Link
                        href={`/episode/${activeSong?.id}`}
                        title={activeSong?.title}
                        className="text-xs text-white/80 cursor-pointer tracking-wide w-[40vw] xs:w-[45vw] sm:w-[55vw] overflow-hidden overflow-ellipsis hover:text-[#1e2531] transition-[.4] truncate"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {activeSong?.title}
                      </Link>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:gap-4 items-center justify-center">
                    <div className="hidden sm:flex">
                      <TooltipWrapper content="Repeat" position="top">
                        <BsArrowRepeat
                          color={repeat ? "red" : "white"}
                          size={20}
                          onClick={handleRepeatClick}
                          className="cursor-pointer"
                        />
                      </TooltipWrapper>
                    </div>

                    <TooltipWrapper content="Prev" position="top">
                      <AiOutlineStepForward
                        color="#fff"
                        size={20}
                        className={`rotate-180 cursor-pointer`}
                        onClick={handlePrevSong}
                      />
                    </TooltipWrapper>
                    {isLoading ? (
                      <button className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition">
                        <ColorRing
                          visible={true}
                          height="40"
                          width="40"
                          ariaLabel="blocks-loading"
                          wrapperStyle={{}}
                          wrapperClass="blocks-wrapper"
                          colors={[
                            "#FF6A00",
                            "#FF8C1A",
                            "#FFA94D",
                            "#7a6d21",
                            "#FF9340",
                          ]}
                        />
                      </button>
                    ) : (
                      <>
                        {isPlaying ? (
                          <TooltipWrapper content="Pause" position="top">
                            <button
                              className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                              onClick={handlePlayPause} // help create a function that will trigger plays api when player time percentage is 15%
                            >
                              <BsFillPauseFill size={32} color="#fff" />
                            </button>
                          </TooltipWrapper>
                        ) : (
                          <TooltipWrapper content="Play" position="top">
                            <button
                              className="flex items-center justify-center bg-gradient-button h-10 w-10 overflow-hidden rounded-full z-10 transition"
                              onClick={handlePlayPause}
                            >
                              <SvgPlayIcon className="h-6 w-6" />
                            </button>
                          </TooltipWrapper>
                        )}
                      </>
                    )}
                    <TooltipWrapper content="Next" position="top">
                      <AiOutlineStepForward
                        color="#fff"
                        size={20}
                        className="cursor-pointer"
                        onClick={handleNextSong}
                      />
                    </TooltipWrapper>
                  </div>

                  <div className="flex items-center justify-end">
                    <VolumeBar
                      value={volume}
                      min="0"
                      max="1"
                      onChange={(e) =>
                        dispatch(setVolume(parseFloat(e.target.value)))
                      }
                      isMinimized={!isMinimizedPlayer}
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
          <Player
            seekTime={seekTime}
            repeat={repeat}
            onEnded={() => {
              // --- RESET TIME LOGIC ---
              setAppTime(0);
              setSeekTime(0);
              localStorage.setItem("checkpoint", "0");
              // -------------------------

              handleNextSong();
              dispatch(setIsEpisodeRegistered(false));
            }}
            onTimeUpdate={(e: any) => {
              const time = e.target.currentTime;
              setAppTime(time);
              if (time > 5) localStorage.setItem("checkpoint", time.toString());
              if (time >= duration * 0.15 && !isEpisodeRegistered) {
                registerPlayMutation.mutate(activeSong?.id);
                dispatch(setIsEpisodeRegistered(true));
              }
            }}
            onLoadedData={(e: any) => {
              setDuration(e.target.duration);
              dispatch(setIsLoadingSong(false));
            }}
          />

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
              {(onClose) => (
                <AddToPlaylistModal episode={activeSong!} onClose={onClose} />
              )}
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
};

export default MusicPlayer;
