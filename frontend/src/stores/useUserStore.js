import {create} from 'zustand';
import axios from '../lib/axios';
import {toast} from 'react-hot-toast'

export const useUserStore = create((set, get)=> ({
    user: null,
    loading: false,
    checkingAuth: true,

    signup: async ({name,email,password,confirmPassword})=>{
        set({loading:true});
        if(password !== confirmPassword){
            toast.error("Passwords do not match")
            set({loading:false});
            return;
        }
        try {
            const res = await axios.post("/auth/signup", {name,email,password});
            console.log(res.data);
            set({user: res.data, loading:false});
        } catch (error) {
            set({loading:false});
            toast.error(error.response.data.message || "An error occurred");
        }
    },
    login: async (email,password)=>{
        set({loading:true});
        try {
            const res = await axios.post("/auth/login", {email,password});
            set({user: res.data, loading:false});
            get().checkAuth()
        } catch (error) {
            set({loading:false});
            toast.error(error.response.data.message || "An error occurred");
        }
    },

    checkAuth: async ()=>{
        set({ checkingAuth: true });
		try {
			const response = await axios.get("/auth/profile");
            //console.log(response.data);
            
			set({ user: response.data, checkingAuth: false });
		} catch (error) {
			console.log(error.message);
			set({ checkingAuth: false, user: null });
		}
    },
    logout: async ()=>{
        set({loading:true});
        try {
            const res = await axios.post("/auth/logout");
            console.log(res.data);
            
            set({user:null,loading:false});
        } catch (error) {
            set({loading:false});
            toast.error(error.response.data.message || "An error occurred");
        }
    },
    refreshToken: async ()=>{
        //prevent multiple simultaneous
        if(get().checkAuth){
            return;
        }
        set({checkingAuth:true});
        try {
            const res = await axios.post("/auth/refresh-token");
            set({user: res.data, checkingAuth:false});
            return res.data;
        } catch (error) {
            console.log(error.message);
            set({checkingAuth:false, user:null});
        }
    }
}))

//implement the axios interceptor for the refreshing the access token
let refreshPromise = null;

axios.interceptors.response.use(
    //if no error, i.e. access token is not expired, so simply return the response
    (response) => response,
    async (error) => {
        const originalRequest = error.config; 
        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;
            try {
                //if refresh token is already being fetched, then wait for it to complete
                if(refreshPromise){
                    await refreshPromise;
                    return axios(originalRequest);
                }

                //start a new refresh token request
                refreshPromise = useUserStore.getState().refreshToken();
                await refreshPromise;
                refreshPromise = null;
                return axios(originalRequest);
                
            } catch (error) {
                //if refresh token fails, logout the user
                useUserStore.getState().logout();   
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
)