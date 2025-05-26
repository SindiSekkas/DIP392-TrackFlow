package com.magic.trackflow.di

import com.magic.trackflow.data.network.ApiService
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    
    private fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    private fun provideDebugInterceptor(): okhttp3.Interceptor {
        return okhttp3.Interceptor { chain ->
            val request = chain.request()
            android.util.Log.d("NetworkDebug", "Request URL: ${request.url}")
            android.util.Log.d("NetworkDebug", "Request Method: ${request.method}")
            android.util.Log.d("NetworkDebug", "Request Headers: ${request.headers}")
            
            try {
                val response = chain.proceed(request)
                android.util.Log.d("NetworkDebug", "Response Code: ${response.code}")
                android.util.Log.d("NetworkDebug", "Response Message: ${response.message}")
                return@Interceptor response
            } catch (e: Exception) {
                android.util.Log.e("NetworkDebug", "Network Error: ${e.message}", e)
                throw e
            }
        }
    }
    
    private fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(provideLoggingInterceptor())
            .addInterceptor(provideDebugInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    private fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }
    
    private fun provideRetrofit(okHttpClient: OkHttpClient, moshi: Moshi): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiService.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }
    
    fun provideApiService(): ApiService {
        val okHttpClient = provideOkHttpClient()
        val moshi = provideMoshi()
        val retrofit = provideRetrofit(okHttpClient, moshi)
        return retrofit.create(ApiService::class.java)
    }
}
