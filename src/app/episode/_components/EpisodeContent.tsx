"use client";
import React, { useState } from "react";
import { useQuery } from "react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiClock, FiCalendar, FiUser, FiShare2, FiStar } from "react-icons/fi";

import PlayButton from "@/components/actions/PlayButton";
import Picture from "@/components/picture/Index";
import GlobalLoader from "@/components/reusables/GlobalLoader";
import { formatDateYMD, formatDuration } from "@/components/utils/constants";
import {
	BaseUrl,
	getEpisode,
	getEpisodeComments,
} from "@/components/utils/endpoints";
import { APICall } from "@/components/utils/extra";
import { BackButton } from "@/components/utils/function";

import Comment from "./Comment";
import EpisodeQueueListAdd from "@/components/Cards/_components/EpisodeQueueListAdd";
import EpisodeFavouriteFunc from "@/components/episodefunctions/EpisodeFavouriteFunc";
import { RiShareLine } from "react-icons/ri";
import { Modal, ModalContent, Tooltip, useDisclosure } from "@heroui/react";
import EpisodePlayListAdd from "@/components/Cards/_components/EpisodePlayListAdd";
import AddToPlaylistModal from "@/components/Modal/AddToPlaylistModal";

import { MessageSquarePlus } from "lucide-react";
import { useMutation, useQueryClient } from "react-query";
import { createComment } from "@/components/utils/endpoints";

import { useAppSelector } from "@/components/Hooks";
interface EpisodeContentProps {
	episodeId: string;
}

const CommentSkeleton = () => {
	return (
		<div className='flex gap-4 p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl animate-pulse'>
			{/* Avatar Skeleton */}
			<div className='flex-shrink-0'>
				<div className='w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700' />
			</div>

			{/* Content Skeleton */}
			<div className='flex-1 min-w-0 space-y-3'>
				{/* Header with name and date */}
				<div className='flex items-center justify-between gap-2'>
					<div className='h-4 w-32 bg-zinc-800 rounded' />
					<div className='h-3 w-20 bg-zinc-800 rounded' />
				</div>

				{/* Comment body skeleton - multiple lines */}
				<div className='space-y-2'>
					<div className='h-3 w-full bg-zinc-800 rounded' />
					<div className='h-3 w-5/6 bg-zinc-800 rounded' />
					<div className='h-3 w-4/6 bg-zinc-800 rounded' />
				</div>

				{/* Footer with action buttons */}
				<div className='mt-3 flex items-center gap-4'>
					<div className='h-3 w-12 bg-zinc-800 rounded' />
					<div className='h-3 w-12 bg-zinc-800 rounded' />
					<div className='h-3 w-24 bg-zinc-800 rounded ml-auto' />
				</div>
			</div>
		</div>
	);
};

const EpisodeContent = ({ episodeId }: EpisodeContentProps) => {
	const queryClient = useQueryClient();
	const { user } = useAppSelector((state: any) => state.auth);
	const [commentBody, setCommentBody] = useState("");
	const [shareOpen, setShareOpen] = useState(false);

	const {
		isOpen: isOpenAddToPlaylistModal,
		onOpen: onOpenAddToPlaylistModal,
		onOpenChange: onOpenChangeAddToPlaylistModal,
	} = useDisclosure();

	const { data: episodeData, isLoading: episodeIsLoading } = useQuery(
		["episode", episodeId],
		async () => {
			const response = await APICall(getEpisode, [episodeId], false, false);
			return response.data.data;
		},
		{ staleTime: Infinity },
	);

	const { data: episodeCommentsData, isLoading: episodeCommentsIsLoading } =
		useQuery(
			["episode-comments", episodeId],
			async () => {
				const response = await APICall(
					getEpisodeComments,
					[episodeId],
					false,
					false,
				);
				return response.data.data;
			},
			{ staleTime: Infinity },
		);

	const EpisodeData: PodcastEpisode = episodeData?.data;
	const EpisodeCommentsData: EpisodeComment[] = episodeCommentsData?.data?.data;

	const fullUrl = `${BaseUrl}/episode/${episodeId}`;

	// Add this mutation alongside the existing queries:
	const createCommentMutation = useMutation(
		() =>
			APICall(
				createComment,
				[Number(episodeId), { body: commentBody.trim() }],
				true,
				true,
			),
		{
			onSuccess: () => {
				queryClient.invalidateQueries(["episode-comments", episodeId]);
				setCommentBody("");
			},
			onError: (err) => console.error("Create comment error:", err),
		},
	);

	const handleSubmitComment = () => {
		if (!commentBody.trim() || createCommentMutation.isLoading) return;
		createCommentMutation.mutate();
	};

	if (episodeIsLoading) return <GlobalLoader isPending={true} />;

	const handleNativeShare = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: EpisodeData?.title,
					text: EpisodeData?.description,
					url: fullUrl,
				});
			} catch (err) {
				console.log("Share cancelled");
			}
		}
	};

	return (
		<>
			<main className='min-h-screen bg-[#050505] text-white overflow-x-hidden'>
				{EpisodeData?.id && (
					<div className='relative w-full'>
						{/* 1. CINEMATIC HEADER (Adaptive Height) */}
						<div className='absolute top-0 left-0 w-full h-[50vh] lg:h-[70vh] overflow-hidden'>
							<div
								className='w-full h-full bg-cover bg-center scale-110 blur-3xl opacity-40 transition-all duration-1000'
								style={{ backgroundImage: `url(${EpisodeData?.picture_url})` }}
							/>
							{/* Deeper gradient for mobile readability */}
							<div className='absolute inset-0 bg-gradient-to-b from-black/60 via-[#050505]/90 to-[#050505]' />
						</div>

						<div className='relative z-10 max-w-[1440px] mx-auto px-5 lg:px-12 pt-6 lg:pt-8 pb-20'>
							{/* TOP NAVIGATION BAR */}
							<div className='flex items-center justify-between mb-3'>
								<BackButton className='bg-zinc-900/80 border border-white/10 backdrop-blur-md rounded-xl p-2.5 hover:bg-zinc-800 transition-all' />
							</div>

							<div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16'>
								{/* 2. THE COMPONENT IMAGE (Mobile: Centered & Elevated) */}
								<div className='lg:col-span-4 lg:sticky lg:top-32'>
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										className='relative group aspect-square w-64 lg:w-full max-w-[400px] mx-auto'
									>
										<div className='absolute inset-0 bg-primary-600/20 blur-[50px] rounded-full' />
										<Picture
											src={EpisodeData?.picture_url || ""}
											alt={EpisodeData?.title}
											className='relative z-10 w-full h-full object-cover rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 shadow-2xl transition-transform duration-500'
										/>
									</motion.div>
								</div>

								{/* 3. TECHNICAL SPECS SECTION */}
								<div className='lg:col-span-8 flex flex-col space-y-6 lg:space-y-8'>
									<div className='space-y-4 text-center lg:text-left'>
										<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-widest mx-auto lg:mx-0'>
											{EpisodeData?.podcast?.category_name}
										</div>

										<h1 className='text-3xl lg:text-6xl font-black leading-tight tracking-tighter text-white'>
											{EpisodeData?.title}
										</h1>

										<div className='flex items-center justify-center lg:justify-start gap-3'>
											<div className='h-px w-8 bg-zinc-800 hidden lg:block' />
											<p className='text-zinc-500 font-bold uppercase tracking-widest text-[11px] lg:text-sm'>
												By:{" "}
												<span className='text-white'>
													{/* {EpisodeData?.podcast?.author} */}
													Estumuzik
												</span>
											</p>
										</div>
									</div>

									{/* METADATA SOCKETS */}
									<div className='grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0 w-full'>
										<div className='bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center lg:items-start'>
											<span className='text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1'>
												Deployment
											</span>
											<div className='text-white font-mono text-xs text-center lg:text-start'>
												{formatDateYMD(EpisodeData?.created_at)}
											</div>
										</div>
										<div className='bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col items-center lg:items-start'>
											<span className='text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1'>
												Runtime
											</span>
											<div className='text-white font-mono text-xs text-center lg:text-start'>
												{formatDuration(EpisodeData?.duration)}
											</div>
										</div>
									</div>

									{/* 4. MASTER CONTROL CONSOLE (Mobile Optimized) */}
									<div className='lg:pt-4 flex flex-col items-center lg:items-start gap-8'>
										{/* Utility Sockets */}
										<div className='flex items-center justify-center gap-3 w-full lg:w-auto border-y border-white/5 py-6 lg:border-none lg:py-0'>
											<PlayButton
												episode={EpisodeData && EpisodeData}
												className='grid place-items-center text-white bg-primary-700 rounded-full p-2 size-fit'
											/>
											<EpisodeFavouriteFunc episodeData={EpisodeData} />
											<EpisodeQueueListAdd episodeData={EpisodeData} />
											<EpisodePlayListAdd
												episodeData={EpisodeData}
												onOpenAddToPlaylistModal={onOpenAddToPlaylistModal}
											/>

											<button
												onClick={handleNativeShare}
												className='size-11 flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/50 text-white/60 hover:text-white transition-all active:scale-95 shadow-sm'
											>
												<RiShareLine className='text-xl' />
											</button>
										</div>
									</div>

									{/* SUMMARY BLOCK */}
									<div className='mt-4 p-6 bg-zinc-900/20 rounded-[2rem] border border-white/5 text-zinc-400 text-sm leading-relaxed relative overflow-hidden group'>
										<div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity'>
											<RiShareLine size={80} />
										</div>
										<h4 className='text-white font-black mb-4 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2'>
											<div className='w-1 h-3 bg-primary-500' />
											Summary
										</h4>
										<div
											className='font-medium'
											dangerouslySetInnerHTML={{
												__html:
													EpisodeData?.description ||
													"No description provided.",
											}}
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* COMMENTS SECTION */}
				<div className='max-w-[1440px] mx-auto px-5 lg:px-12 pb-20'>
					<h3 className='text-xl font-black tracking-tighter mb-8 flex items-center gap-3'>
						Comments{" "}
						<span className='text-primary-500 text-xs not-italic tracking-normal'>
							[{EpisodeCommentsData?.length || 0}]
						</span>
					</h3>

					{/* ── Comment Composer ── */}
					<div className='mb-8 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 space-y-3'>
						<p className='text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2'>
							<MessageSquarePlus size={12} className='text-primary-500' />
							Leave a comment
						</p>
						<textarea
							value={commentBody}
							onChange={(e) => setCommentBody(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSubmitComment();
								}
							}}
							placeholder='Share your thoughts...'
							disabled={createCommentMutation.isLoading}
							rows={3}
							className='w-full bg-zinc-800/60 border border-zinc-700/50 focus:border-primary-500/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none transition-colors disabled:opacity-50'
						/>
						<div className='flex items-center justify-between'>
							<span className='text-[10px] text-zinc-600'>
								Shift + Enter for new line
							</span>
							<button
								onClick={handleSubmitComment}
								disabled={
									!commentBody.trim() || createCommentMutation.isLoading
								}
								className='flex items-center justify-center gap-2 w-36 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
							>
								{createCommentMutation.isLoading ? (
									<div className='animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent' />
								) : (
									<>
										<MessageSquarePlus size={13} />
										Post Comment
									</>
								)}
							</button>
						</div>
					</div>

					{/* ── Comment List ── */}
					<div className='space-y-4'>
						{episodeCommentsIsLoading ? (
							<>
								<CommentSkeleton />
								<CommentSkeleton />
								<CommentSkeleton />
							</>
						) : EpisodeCommentsData && EpisodeCommentsData.length > 0 ? (
							EpisodeCommentsData.map((comment, i) => (
								<Comment
									key={comment.id ?? i}
									user={comment.user}
									comment={comment}
									episodeId={episodeId}
									currentUserId={user?.id}
								/>
							))
						) : (
							<div className='py-10 text-center border-2 border-dashed border-zinc-900 rounded-[2rem]'>
								<p className='text-zinc-600 font-bold uppercase tracking-widest text-xs'>
									No Comments Yet — Be the first!
								</p>
							</div>
						)}
					</div>
				</div>
			</main>

			<Modal
				isOpen={isOpenAddToPlaylistModal}
				onOpenChange={onOpenChangeAddToPlaylistModal}
				size='md'
				backdrop='opaque'
				classNames={{
					closeButton: "z-50",
				}}
			>
				<ModalContent className='bg-black-500'>
					{(onClose) => (
						<AddToPlaylistModal episode={EpisodeData} onClose={onClose} />
					)}
				</ModalContent>
			</Modal>
		</>
	);
};

export default EpisodeContent;
